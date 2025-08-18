// netlify/functions/cf-stats.js
// Cloudflare Analytics via GraphQL (REST is sunset)

exports.handler = async () => {
  const token = process.env.CF_API_TOKEN;
  const zone  = process.env.CF_ZONE_ID;
  if (!token || !zone) {
    return {
      statusCode: 200,
      body: JSON.stringify({ enabled: false, reason: "Missing CF_API_TOKEN or CF_ZONE_ID" })
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const now       = new Date();
  const since7d   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since24h  = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const untilISO  = now.toISOString();

  const gqlTotals = `
    query($zone:String!, $since:Time!, $until:Time!) {
      viewer { zones(filter: { zoneTag: $ $zone }) {
        httpRequests1dGroups(limit: 200, filter: { datetime_geq: $since, datetime_leq: $until }) {
          sum  { requests }
          uniq { uniques }
        }
      } }
    }`.replace("$ $zone", "zone"); // avoid f-string confusion

  const gqlCountries = `
    query($zone:String!, $since:Time!, $until:Time!) {
      viewer { zones(filter: { zoneTag: $ $zone }) {
        httpRequests1dGroups(
          limit: 200,
          orderBy: [sum_requests_DESC],
          filter: { datetime_geq: $since, datetime_leq: $until }
        ) {
          dimensions { clientCountryName }
          sum { requests }
        }
      } }
    }`.replace("$ $zone", "zone");

  const gqlFirewall = `
    query($zone:String!, $since:Time!, $until:Time!) {
      viewer { zones(filter: { zoneTag: $ $zone }) {
        firewallEventsAdaptive(
          limit: 10000,
          filter: { datetime_geq: $since, datetime_leq: $until }
        ) { action }
      } }
    }`.replace("$ $zone", "zone");

  const post = async (query, variables) => {
    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    return r.json();
  };

  try {
    let pageviews_7d = 0;
    let uniques_7d   = 0;
    try {
      const tj = await post(gqlTotals, { zone, since: since7d, until: untilISO });
      const groups = tj?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
      for (const g of groups) {
        pageviews_7d += g?.sum?.requests || 0;
        uniques_7d   += g?.uniq?.uniques || 0;
      }
    } catch {}

    let top_countries_24h = [];
    try {
      const cj = await post(gqlCountries, { zone, since: since24h, until: untilISO });
      const groups = cj?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
      top_countries_24h = groups
        .map(g => ({ country: g?.dimensions?.clientCountryName || "Unknown", count: g?.sum?.requests || 0 }))
        .filter(x => x.count > 0)
        .slice(0, 10);
    } catch {}

    let rate_limited_24h = null;
    try {
      const fj = await post(gqlFirewall, { zone, since: since24h, until: untilISO });
      const evts = fj?.data?.viewer?.zones?.[0]?.firewallEventsAdaptive || [];
      const map = {};
      for (const e of evts) {
        const a = (e.action || "unknown").toLowerCase();
        map[a] = (map[a] || 0) + 1;
      }
      rate_limited_24h = {
        total: evts.length,
        actions: Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([action,count])=>({ action, count }))
      };
    } catch {}

    return {
      statusCode: 200,
      body: JSON.stringify({
        enabled: true,
        pageviews_7d,
        uniques_7d,
        top_countries_24h,
        rate_limited_24h
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ enabled: false, error: e.message }) };
  }
};
