export async function handler(event, context) {
  try {
    const token = process.env.CF_API_TOKEN;
    const zone = process.env.CF_ZONE_ID;
    if (!token || !zone) {
      return resp(503, { enabled:false, reason:"missing CF env vars" });
    }
    const params = event.queryStringParameters || {};
    let days = parseInt(params.days || "7", 10);
    if (isNaN(days) || days <= 0) days = 7;
    if (days > 90) days = 90;
    const end = new Date();
    const start = new Date(Date.now() - days*24*3600*1000);
    const query = `
      query($zone: String!, $start: Time!, $end: Time!) {
        viewer {
          zones(filter: { zoneTag: $zone }) {
            httpRequestsAdaptiveGroups(
              limit: 100
              filter: { datetime_geq: $start, datetime_leq: $end }
            ) {
              sum { requests, bytes, threatsBlocked: threats }
              dimensions { edgeResponseStatus }
            }
            firewallEventsAdaptiveGroups(
              limit: 100
              filter: { datetime_geq: $start, datetime_leq: $end }
            ) { dimensions { action } count }
            topCountries: httpRequests1dGroups(limit: 100, filter: { datetime_geq: $start, datetime_leq: $end }) {
              dimensions { clientCountryName }
              sum { requests }
            }
          }
        }
      }`;
    const variables = { zone, start: start.toISOString(), end: end.toISOString() };
    const cf = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
      body: JSON.stringify({ query, variables })
    });
    const json = await cf.json();
    if (json.errors) {
      return resp(200, { enabled:false, reason:"Cloudflare GraphQL error", errors: json.errors });
    }
    const zones = json?.data?.viewer?.zones || [];
    const z = zones[0] || {};
    const reqGroups = z.httpRequestsAdaptiveGroups || [];
    let totalReq = 0, totalBytes = 0, totalThreats = 0;
    for (const g of reqGroups) {
      totalReq += g?.sum?.requests || 0;
      totalBytes += g?.sum?.bytes || 0;
      totalThreats += g?.sum?.threatsBlocked || 0;
    }
    const waf = z.firewallEventsAdaptiveGroups || [];
    const wafTotal = waf.reduce((a, g) => a + (g?.count || 0), 0);
    const countryGroups = z.topCountries || [];
    const byCountry = {};
    for (const c of countryGroups) {
      const name = c?.dimensions?.clientCountryName || "Unknown";
      byCountry[name] = (byCountry[name] || 0) + (c?.sum?.requests || 0);
    }
    const top = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([country, visits])=>({country, visits}));
    return resp(200, {
      enabled:true,
      requests_week: totalReq,
      bytes_week: totalBytes,
      waf_blocked_week: Math.max(totalThreats, wafTotal),
      top_countries_30d: top
    });
  } catch (e) {
    return resp(500, { enabled:false, reason:String(e) });
  }
}
function resp(code, obj){ return { statusCode: code, headers: { "Content-Type":"application/json" }, body: JSON.stringify(obj) }; }
