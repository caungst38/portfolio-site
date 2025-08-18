
// Netlify Function: Cloudflare Stats (REST + GraphQL)
exports.handler = async () => {
  const token = process.env.CF_API_TOKEN;
  const zone  = process.env.CF_ZONE_ID;
  if (!token || !zone) {
    return { statusCode: 200, body: JSON.stringify({ enabled:false, reason:"Missing CF_API_TOKEN or CF_ZONE_ID" }) };
  }
  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  const now = Date.now();
  const since7d = new Date(now - 7*24*60*60*1000).toISOString();
  const since24h = new Date(now - 24*60*60*1000).toISOString();
  const until = new Date(now).toISOString();

  try {
    const dashUrl = `https://api.cloudflare.com/client/v4/zones/${zone}/analytics/dashboard?since=${encodeURIComponent(since7d)}&until=${encodeURIComponent(until)}&continuous=true`;
    const dashRes = await fetch(dashUrl, { headers });
    const dashJson = await dashRes.json();
    if (!dashJson.success) {
      const msg = dashJson.errors?.[0]?.message || `HTTP ${dashRes.status}`;
      return { statusCode: 200, body: JSON.stringify({ enabled:false, reason:`Cloudflare API error: ${msg}` }) };
    }
    const totals = dashJson.result?.totals || {};
    const pageviews_7d = totals.requests?.all || 0;
    const uniques_7d = totals.uniques || totals.visitors?.all || 0;

    const gqlCountries = `
      query($zone:String!, $since:Time!, $until:Time!) {
        viewer { zones(filter:{ zoneTag: $zone }) {
          httpRequests1dGroups(limit: 200, filter:{ datetime_geq: $since, datetime_leq: $until }, orderBy:[sum_requests_DESC]) {
            dimensions { clientCountryName }
            sum { requests }
          } } }
      }`;

    const gqlFirewall = `
      query($zone:String!, $since:Time!, $until:Time!) {
        viewer { zones(filter:{ zoneTag: $zone }) {
          firewallEventsAdaptive(filter:{ datetime_geq: $since, datetime_leq: $until }, limit: 10000) {
            action
          } } }
      }`;

    let top_countries_24h = [];
    let rate_limited_24h = null;

    try {
      const cRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST", headers,
        body: JSON.stringify({ query: gqlCountries, variables: { zone, since: since24h, until } })
      });
      const cJson = await cRes.json();
      const groups = cJson?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
      top_countries_24h = groups.map(g => ({ country: g.dimensions?.clientCountryName || "Unknown", count: g.sum?.requests || 0 }))
                                .filter(x => x.count > 0).slice(0, 10);
    } catch (_) { top_countries_24h = []; }

    try {
      const fRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST", headers,
        body: JSON.stringify({ query: gqlFirewall, variables: { zone, since: since24h, until } })
      });
      const fJson = await fRes.json();
      const evts = fJson?.data?.viewer?.zones?.[0]?.firewallEventsAdaptive || [];
      const map = {};
      for (const e of evts) { const a=(e.action||"unknown").toLowerCase(); map[a]=(map[a]||0)+1; }
      const total = evts.length;
      const actions = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([action,count])=>({action,count}));
      rate_limited_24h = { total, actions };
    } catch (_) { rate_limited_24h = null; }

    return { statusCode: 200, body: JSON.stringify({ enabled:true, pageviews_7d, uniques_7d, top_countries_24h, rate_limited_24h }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ enabled:false, error:e.message }) };
  }
};
