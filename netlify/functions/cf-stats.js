
// Cloudflare GraphQL stats endpoint
const fetch = require('node-fetch');

function isoDate(d){ return d.toISOString().slice(0,10); } // YYYY-MM-DD
function clampDays(n){ n = parseInt(n||'7',10); if(isNaN(n)) n=7; return Math.max(1, Math.min(90, n)); }

exports.handler = async (event)=>{
  try{
    const token = process.env.CF_API_TOKEN;
    const zone = process.env.CF_ZONE_ID;
    if(!token || !zone){
      return { statusCode: 200, body: JSON.stringify({ ok:false, enabled:false, reason:'Missing Cloudflare env vars' }) };
    }
    const days = clampDays(event.queryStringParameters && event.queryStringParameters.days);
    const end = new Date(); // now
    const start = new Date(Date.now() - days*24*3600*1000);
    const date_geq = isoDate(new Date(Date.now() - 7*24*3600*1000)); // for 7-day totals
    const date_lt  = isoDate(new Date()); // exclusive

    const qTotals = `
      query($zone: String!, $d1: Date!, $d2: Date!){
        viewer{
          zones(filter:{zoneTag:$zone}){
            httpRequests1dGroups(filter:{date_geq:$d1, date_lt:$d2}){
              dimensions{date}
              sum{requests}
            }
          }
        }
      }`;
    const vTotals = { zone, d1: date_geq, d2: date_lt };

    const qCountries = `
      query($zone:String!, $from:Time!, $to:Time!){
        viewer{
          zones(filter:{zoneTag:$zone}){
            httpRequestsAdaptiveGroups(
              limit: 50,
              filter:{ datetime_geq:$from, datetime_leq:$to }
            ){
              dimensions{ clientCountryName clientCountry }
              sum{ requests }
            }
          }
        }
      }`;
    const vCountries = { zone, from: new Date(Date.now()-30*24*3600*1000).toISOString(), to: new Date().toISOString() };

    const qWaf = `
      query($zone:String!, $from:Time!, $to:Time!){
        viewer{
          zones(filter:{zoneTag:$zone}){
            firewallEventsAdaptiveGroups(
              limit: 100,
              filter:{ datetime_geq:$from, datetime_leq:$to }
            ){
              dimensions{ action }
              count
            }
          }
        }
      }`;
    const vWaf = { zone, from: new Date(Date.now()-7*24*3600*1000).toISOString(), to: new Date().toISOString() };

    async function gql(query, variables){
      const r = await fetch('https://api.cloudflare.com/client/v4/graphql',{
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({query, variables})
      });
      return r.json();
    }

    const [totals,countries,waf] = await Promise.all([gql(qTotals,vTotals), gql(qCountries,vCountries), gql(qWaf,vWaf)]);

    let requests_7d = 0;
    try{
      const groups = (((totals||{}).data||{}).viewer||{}).zones?.[0]?.httpRequests1dGroups || [];
      requests_7d = groups.reduce((a,g)=> a + (g.sum?.requests||0), 0);
    }catch(_){}

    let top_countries_30d = [];
    try{
      const cg = (((countries||{}).data||{}).viewer||{}).zones?.[0]?.httpRequestsAdaptiveGroups || [];
      const m = new Map();
      cg.forEach(row=>{
        const name = row.dimensions?.clientCountryName || row.dimensions?.clientCountry || 'Unknown';
        const code = row.dimensions?.clientCountry || null;
        const n = row.sum?.requests || 0;
        m.set(name, (m.get(name)||{country:name, code, requests:0}));
        m.get(name).requests += n;
        if (code) m.get(name).code = code;
      });
      top_countries_30d = Array.from(m.values()).sort((a,b)=>b.requests-a.requests).slice(0,5);
    }catch(_){}

    let waf_blocked_7d = 0;
    try{
      const wg = (((waf||{}).data||{}).viewer||{}).zones?.[0]?.firewallEventsAdaptiveGroups || [];
      const okActions = new Set(['block','managed_challenge','js_challenge','challenge']);
      waf_blocked_7d = wg.reduce((a,row)=> okActions.has(String(row.dimensions?.action||'').toLowerCase()) ? a + (row.count||0) : a, 0);
    }catch(_){}

    const body = {
      ok: true,
      enabled: true,
      requests_7d,
      waf_blocked_7d,
      top_countries_30d
    };

    // Optional debug slices
    const dbg = event.queryStringParameters && event.queryStringParameters.debug;
    if (dbg){
      body.debug = {};
      if (dbg==='countries' || dbg==='1' || dbg==='true') body.debug.countries = countries;
      if (dbg==='waf' || dbg==='1' || dbg==='true') body.debug.waf = waf;
      if (dbg==='totals' || dbg==='1' || dbg==='true') body.debug.totals = totals;
    }

    return { statusCode: 200, body: JSON.stringify(body) };
  }catch(e){
    return { statusCode: 200, body: JSON.stringify({ ok:false, enabled:false, reason:String(e) }) };
  }
};
