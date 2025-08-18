
// Netlify Function: Cloudflare GraphQL Analytics proxy (v29)
// Usage: /.netlify/functions/cf-stats?days=7
// Env: CF_API_TOKEN (required), CF_ZONE_ID (required)
const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

function isoDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  // Truncate to start of day for stable day-level groups
  d.setUTCHours(0,0,0,0);
  return d.toISOString();
}

exports.handler = async (event, context) => {
  try {
    const token = process.env.CF_API_TOKEN;
    const zone = process.env.CF_ZONE_ID;
    if (!token || !zone) {
      return {
        statusCode: 503,
        body: JSON.stringify({ ok:false, error: "Missing CF_API_TOKEN or CF_ZONE_ID in environment." })
      };
    }

    const days = Math.max(1, Math.min(90, parseInt(event.queryStringParameters?.days || "7", 10)));
    const start = isoDaysAgo(days);
    const end = new Date().toISOString();

    // GraphQL query: totals + timeseries using httpRequestsAdaptiveGroups
    const query = `
      query HttpOverview($zoneTag: string!, $start: Time!, $end: Time!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            totals: httpRequestsAdaptiveGroups(
              filter: { datetime_geq: $start, datetime_leq: $end }
              limit: 1
            ) {
              count
              sum {
                edgeResponseBytes
                cachedBytes
                threats
              }
              avg {
                sampleInterval
              }
            }
            series: httpRequestsAdaptiveGroups(
              filter: { datetime_geq: $start, datetime_leq: $end }
              orderBy: [datetime_ASC]
              limit: 10000
            ) {
              count
              sum { edgeResponseBytes }
              dimensions { datetime }
            }
            byCountry: httpRequestsAdaptiveGroups(
              filter: { datetime_geq: $start, datetime_leq: $end }
              orderBy: [count_DESC]
              limit: 10
            ) {
              count
              dimensions { clientCountryName }
            }
            statusCodes: httpRequestsAdaptiveGroups(
              filter: { datetime_geq: $start, datetime_leq: $end }
              orderBy: [count_DESC]
              limit: 10
            ) {
              count
              dimensions { originResponseStatus }
            }
          }
        }
      }
    `;

    const variables = { zoneTag: zone, start, end };

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await resp.json();
    if (!resp.ok || data.errors) {
      return { statusCode: 502, body: JSON.stringify({ ok:false, error: data.errors || (await resp.text()) }) };
    }

    const zones = data?.data?.viewer?.zones || [];
    const z = zones[0] || {};
    const totalsRaw = z.totals?.[0] || {};
    const totals = {
      requests: totalsRaw.count ?? 0,
      bytes: totalsRaw.sum?.edgeResponseBytes ?? 0,
      cachedBytes: totalsRaw.sum?.cachedBytes ?? 0,
      threats: totalsRaw.sum?.threats ?? 0,
      sampleInterval: totalsRaw.avg?.sampleInterval ?? 1
    };

    // Timeseries normalize
    const series = (z.series || []).map(r => ({
      datetime: r.dimensions?.datetime,
      requests: r.count ?? 0,
      bytes: r.sum?.edgeResponseBytes ?? 0
    }));

    const topCountries = (z.byCountry || []).map(r => ({
      country: r.dimensions?.clientCountryName,
      requests: r.count
    }));

    const topStatus = (z.statusCodes || []).map(r => ({
      status: r.dimensions?.originResponseStatus,
      requests: r.count
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok:true, rangeDays: days, start, end, totals, series, topCountries, topStatus })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: String(e) }) };
  }
};
