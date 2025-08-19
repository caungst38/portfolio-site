const fetch = require("node-fetch");

function clamp(n, min, max){ n = parseInt(n||"",10); if(isNaN(n)) n = 7; return Math.max(min, Math.min(max, n)); }

exports.handler = async (event) => {
  const token = process.env.CF_API_TOKEN;
  const zone = process.env.CF_ZONE_ID;
  if (!token || !zone) {
    return { statusCode: 200, body: JSON.stringify({ ok:false, enabled:false, error:"Missing CF_API_TOKEN or CF_ZONE_ID" }) };
  }

  const qp = event && event.queryStringParameters || {};
  const days = clamp(qp.days, 1, 90);
  const now = new Date();
  const end = new Date(now.getTime());
  const start = new Date(now.getTime() - days*24*3600*1000);
  const endISO = end.toISOString();
  const startISO = start.toISOString();
  const dateGeq = start.toISOString().slice(0,10); // YYYY-MM-DD
  const dateLt  = new Date(now.getTime()+24*3600*1000).toISOString().slice(0,10); // tomorrow as exclusive upper bound

  const debug = qp.debug || "";

  // Queries
  const qTotals = `
    query ($zone: string, $dateGeq: Date!, $dateLt: Date!) {
      viewer {
        zones(filter: {zoneTag: $zone}) {
          httpRequests1dGroups(
            filter: { date_geq: $dateGeq, date_lt: $dateLt }
            limit: 100
          ) {
            dimensions { date }
            sum { requests }
          }
        }
      }
    }`;

  const qCountries = `
    query ($zone: string, $geq: Time!, $leq: Time!) {
      viewer {
        zones(filter: {zoneTag: $zone}) {
          httpRequestsAdaptiveGroups(
            limit: 500
            filter: { datetime_geq: $geq, datetime_leq: $leq }
            orderBy: [sum_requests_DESC]
          ) {
            dimensions { clientCountry }
            sum { requests }
          }
        }
      }
    }`;

  const qWaf = `
    query ($zone: string, $geq: Time!, $leq: Time!) {
      viewer {
        zones(filter: {zoneTag: $zone}) {
          firewallEventsAdaptiveGroups(
            limit: 1000
            filter: { datetime_geq: $geq, datetime_leq: $leq }
          ) {
            dimensions { action }
            count
          }
        }
      }
    }`;

  async function cfGraphQL(query, variables){
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ query, variables })
    });
    return resp.json();
  }

  try {
    const [totals, countries, waf] = await Promise.all([
      cfGraphQL(qTotals, { zone, dateGeq, dateLt }),
      cfGraphQL(qCountries, { zone, geq: startISO, leq: endISO }),
      cfGraphQL(qWaf, { zone, geq: startISO, leq: endISO }),
    ]);

    let requests7d = 0;
    const tZones = (((totals||{}).data||{}).viewer||{}).zones || [];
    if (tZones.length && tZones[0].httpRequests1dGroups) {
      for (const row of tZones[0].httpRequests1dGroups) {
        requests7d += (row.sum && row.sum.requests) || 0;
      }
    }

    // Countries top5 by clientCountry (alpha-2)
    let topCountries = [];
    const cZones = (((countries||{}).data||{}).viewer||{}).zones || [];
    if (cZones.length && cZones[0].httpRequestsAdaptiveGroups) {
      const agg = {};
      for (const row of cZones[0].httpRequestsAdaptiveGroups) {
        const cc = (row.dimensions && row.dimensions.clientCountry) || "UN";
        const req = (row.sum && row.sum.requests) || 0;
        agg[cc] = (agg[cc] || 0) + req;
      }
      topCountries = Object.entries(agg).map(([country, requests])=>({country, requests}))
        .sort((a,b)=>b.requests - a.requests).slice(0,5);
    }

    // WAF: count selected actions
    let wafBlocked7d = 0;
    const wZones = (((waf||{}).data||{}).viewer||{}).zones || [];
    if (wZones.length && wZones[0].firewallEventsAdaptiveGroups) {
      for (const row of wZones[0].firewallEventsAdaptiveGroups) {
        const action = (row.dimensions && row.dimensions.action) || "";
        const count = row.count || 0;
        if (["block","managed_challenge","js_challenge","challenge"].includes(action.toLowerCase())) {
          wafBlocked7d += count;
        }
      }
    }

    const body = {
      ok: true,
      enabled: true,
      requests_7d: requests7d,
      waf_blocked_7d: wafBlocked7d,
      top_countries_30d: topCountries
    };

    if (debug) {
      body.debug = {};
      if (debug === "countries" || debug === "1") body.debug.countries = countries;
      if (debug === "waf"       || debug === "1") body.debug.waf = waf;
      if (debug === "totals"    || debug === "1") body.debug.totals = totals;
    }

    return { statusCode: 200, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok:false, enabled:false, error: String(e) }) };
  }
};