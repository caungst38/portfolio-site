
// Netlify Function: Cloudflare GraphQL Analytics -> summarized stats JSON
// Requires env: CF_API_TOKEN, CF_ZONE_ID

export async function handler(event) {
  const token = process.env.CF_API_TOKEN;
  const zone = process.env.CF_ZONE_ID;

  try{
    if(!token || !zone){
      return resp(200, { enabled:false, reason:"Missing CF_API_TOKEN or CF_ZONE_ID" });
    }

    const days = Number((event.queryStringParameters||{}).days || 7);
    const until = new Date();
    const since = new Date(Date.now() - days*24*3600*1000);

    const query = `
      query ($zoneTag: String!, $since: Time!, $until: Time!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            # totals over window
            totals: httpRequestsAdaptiveGroups(
              filter: { datetime_geq: $since, datetime_leq: $until }
            ) {
              sum { requests, pageViews }
            }
            # top countries last 24h
            topCountries: httpRequestsAdaptiveGroups(
              limit: 10,
              orderBy: [sum_requests_DESC],
              filter: { datetime_geq: $since, datetime_leq: $until }
            ) {
              dimensions { clientCountryName }
              sum { requests }
            }
            # rate-limited actions in last 24h (if any)
            rl: firewallEventsAdaptiveGroups(
              limit: 10,
              filter: { datetime_geq: $since, datetime_leq: $until, action_neq: "allow" },
              orderBy: [count_DESC]
            ) {
              dimensions { action }
              count
            }
          }
        }
      }
    `;

    const variables = {
      zoneTag: zone,
      since: since.toISOString(),
      until: until.toISOString()
    };

    const cfResp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables })
    });

    const json = await cfResp.json();
    if(json.errors){
      return resp(200, { enabled:false, reason:"Cloudflare GraphQL error", errors: json.errors });
    }

    const zones = json?.data?.viewer?.zones || [];
    const z = zones[0] || {};

    const totals = (z.totals || []).reduce((acc, row)=>{
      acc.requests = (acc.requests||0) + (row?.sum?.requests||0);
      acc.pageViews = (acc.pageViews||0) + (row?.sum?.pageViews||0);
      return acc;
    }, {});

    const top_countries_24h = (z.topCountries || []).map(r=>({ 
      country: r?.dimensions?.clientCountryName || "Unknown",
      count: r?.sum?.requests || 0
    }));

    const rate_limited_24h = {
      total: (z.rl || []).reduce((a,b)=> a + (b?.count||0), 0),
      actions: (z.rl || []).map(r=>({ action: r?.dimensions?.action || "unknown", count: r?.count||0 }))
    };

    return resp(200, {
      enabled:true,
      pageviews_7d: totals.pageViews || 0,
      uniques_7d: undefined, // not available directly from this dataset
      top_countries_24h,
      rate_limited_24h
    });
  }catch(e){
    return resp(500, { enabled:false, error: String(e) });
  }
}

function resp(statusCode, body){
  return { statusCode, headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) };
}
