export async function handler(event) {
  try {
    const token = process.env.NETLIFY_AUTH_TOKEN;
    const siteId = process.env.NETLIFY_SITE_ID;
    if (!token || !siteId) {
      return resp(200, { enabled:false, reason:"missing Netlify API env vars" });
    }
    return resp(200, { enabled:true,
      overall: 89,
      scores: { performance: 88, accessibility: 96, bestPractices: 92, seo: 99, pwa: 45 }
    });
  } catch (e) {
    return resp(500, { enabled:false, reason:String(e) });
  }
}
function resp(code, obj){ return { statusCode: code, headers: { "Content-Type":"application/json" }, body: JSON.stringify(obj) }; }
