
/* netlify/functions/cf-stats.js — Cloudflare analytics (7d) */

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const zone = process.env.CLOUDFLARE_ZONE_ID;
    if (!token || !zone) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, reason: 'Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID' }) };
    }

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 7-day window
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);

    const url = `https://api.cloudflare.com/client/v4/zones/${zone}/analytics/dashboard?since=${start.toISOString()}&until=${end.toISOString()}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ ok:false, reason: 'Cloudflare API error', details: text }) };
    }
    const data = await resp.json();

    const totals = data?.result?.totals || {};
    const requests_7d = totals?.requests?.all || 0;
    const threats_7d = totals?.threats?.all || 0;

    return { statusCode: 200, body: JSON.stringify({ ok:true, requests_7d, threats_7d, top_countries_30d: [] }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, reason: e.message }) };
  }
};
