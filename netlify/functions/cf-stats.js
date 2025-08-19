
// Cloudflare Analytics via GraphQL — tolerant handler
exports.handler = async (event) => {
  try{
    const token = process.env.CF_API_TOKEN;
    const zone  = process.env.CF_ZONE_ID;
    if(!token || !zone){
      return { statusCode: 200, body: JSON.stringify({ enabled:false, ok:false, reason:"Missing CF_API_TOKEN or CF_ZONE_ID" }) };
    }
    const qs = event && event.queryStringParameters || {};
    const days = Math.max(1, Math.min(90, parseInt(qs.days||'7',10)||7));

    const now = new Date();
    const since7 = new Date(now.getTime() - days*24*3600*1000).toISOString();
    const since30 = new Date(now.getTime() - 30*24*3600*1000).toISOString();
    const until = now.toISOString();

    async function gql(query, variables){
      const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables })
      });
      return r.json();
    }

    // 1) 1d totals (requests)
    const qTotals = `
      query($zone:String!, $since:Time!, $until:Time!){
        viewer {
          zones(filter:{ zoneTag: $zone }) {
            httpRequests1dGroups(limit: 100, filter:{ datetime_geq: $since, datetime_leq: $until }) {
              sum { requests }
              dimensions { date }
            }
          }
        }
      }`;
    const tRes = await gql(qTotals, { zone, since: since7, until });
    let requests_7d = 0;
    try{
      const rows = tRes.data.viewer.zones[0].httpRequests1dGroups || [];
      requests_7d = rows.reduce((s,r)=> s + (r.sum?.requests||0), 0);
    }catch{}

    // 2) WAF blocked — firewall events (best effort; count field differs by dataset)
    let waf_blocked_7d = 0;
    try{
      const qWaf = `
        query($zone:String!, $since:Time!, $until:Time!){
          viewer {
            zones(filter:{ zoneTag: $zone }) {
              firewallEventsAdaptiveGroups(
                limit: 1000,
                filter:{ datetime_geq: $since, datetime_leq: $until, action_in: [BLOCK, CHALLENGE, JS_CHALLENGE, MANAGED_CHALLENGE] }
              ){
                count
              }
            }
          }
        }`;
      const wRes = await gql(qWaf, { zone, since: since7, until });
      const rows = wRes.data.viewer.zones[0].firewallEventsAdaptiveGroups || [];
      waf_blocked_7d = rows.reduce((s,r)=> s + (r.count||0), 0);
    }catch{ /* tolerate schema issues */ }

    // 3) Top countries (30d)
    let top_countries_30d = [];
    try{
      const qCountries = `
        query($zone:String!, $since:Time!, $until:Time!){
          viewer {
            zones(filter:{ zoneTag: $zone }) {
              httpRequestsAdaptiveGroups(
                limit: 1000,
                orderBy:[sum_requests_DESC],
                filter:{ datetime_geq: $since, datetime_leq: $until }
              ){
                dimensions { clientCountryName: clientCountryName clientCountryCode: clientCountry }
                sum { requests }
              }
            }
          }
        }`;
      const cRes = await gql(qCountries, { zone, since: since30, until });
      const rows = cRes.data.viewer.zones[0].httpRequestsAdaptiveGroups || [];
      top_countries_30d = rows
        .map(r=>({ country: (r.dimensions?.clientCountryCode||'').toUpperCase(), name: r.dimensions?.clientCountryName || '', requests: r.sum?.requests||0 }))
        .filter(r=>r.requests>0)
        .sort((a,b)=>b.requests-a.requests)
        .slice(0,5);
    }catch{}

    return { statusCode: 200, body: JSON.stringify({ ok:true, enabled:true, requests_7d, waf_blocked_7d, top_countries_30d }) };
  }catch(e){
    return { statusCode: 200, body: JSON.stringify({ ok:false, enabled:false, reason: String(e) }) };
  }
};
