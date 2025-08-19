
async function loadStats(){
  try{
    // HTTPS state
    const httpsEl = document.getElementById('httpsState');
    if (httpsEl) {
      const secure = location.protocol === 'https:';
      httpsEl.innerHTML = secure ? 'Encrypted <span aria-label="locked">🔒</span>' : 'Not Encrypted <span aria-label="unlocked">🔓</span>';
    }

    // Security headers (best-effort)
    const secEl = document.getElementById('secHeaders');
    if (secEl) {
      try{
        const r = await fetch(location.pathname || '/', { method:'GET', cache:'no-store' });
        const wanted = ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'];
        const pills = [];
        for(const h of wanted){
          const v = r.headers.get(h);
          if (v) pills.push(`<span class="pill ok" title="${h}: ${v}">${h.toUpperCase()}</span>`);
          else pills.push(`<span class="pill warn" title="Missing ${h}">${h.toUpperCase()}</span>`);
        }
        secEl.innerHTML = pills.join('');
      }catch(e){ secEl.innerHTML = '<span class="pill warn">Headers Unavailable</span>'; }
    }

    // Cache status for style.css (Cloudflare)
    const cacheEl = document.getElementById('cacheStatus');
    if (cacheEl) {
      try{
        const r = await fetch('style.css?v=' + Date.now(), { cache:'no-store' });
        const cf = r.headers.get('cf-cache-status') || r.headers.get('age') || '—';
        cacheEl.textContent = cf;
      }catch(e){ cacheEl.textContent = '—'; }
    }

    // Cloudflare stats
    const res = await fetch('/.netlify/functions/cf-stats');
    const j = await res.json();
    const ok = !!j.ok || !!j.enabled;
    const cfEl = document.getElementById('cfStatus');
    if (cfEl) cfEl.textContent = ok ? 'Connected' : (j.reason || 'Unavailable');

    // Top countries
    const countriesEl = document.getElementById('topCountries');
    if (countriesEl) {
      const src = j.top_countries_30d || j.top_countries_24h || [];
      if (!src.length) { (countriesEl.closest('.card')||countriesEl).style.display='none'; }
      else {
        const top = src.slice(0,5).map((c,i)=>{
          const flag = countryFlagEmoji(c.country) || '🌐';
          const count = Number(c.requests || c.count || 0).toLocaleString();
          return `<div class="row"><span>${i+1}.</span> <span>${flag} ${c.country}</span> <b>${count}</b></div>`;
        }).join('');
        countriesEl.innerHTML = top;
      }
    }

    // Rate limited / WAF blocked
    const rlEl = document.getElementById('rateLimited');
    if (rlEl) {
      const total = j.waf_blocked_7d || (j.rate_limited_24h && j.rate_limited_24h.total) || 0;
      if (!total) { (rlEl.closest('.card')||rlEl).style.display='none'; }
      else rlEl.innerHTML = `<b>${Number(total).toLocaleString()}</b> in the window`;
    }
  }catch(e){
    // Hide dynamic cards on failure
    for(const id of ['topCountries','rateLimited','cfStatus']) {
      const el = document.getElementById(id);
      if (el) (el.closest('.card')||el).style.display='none';
    }
  }
}

// simple flag emoji; not exhaustive but works for common ISO codes
function countryFlagEmoji(code){
  if(!code || code.length!==2) return '';
  const A = 0x1F1E6;
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => A + (c.charCodeAt(0)-65)));
}

document.addEventListener('DOMContentLoaded', loadStats);
