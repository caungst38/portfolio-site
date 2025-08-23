/* app.js — updated to display Total Threats Mitigated (7d) */

async function loadStats(){
  try{
    try{
      // HTTPS
      const httpsEl = document.getElementById('httpsState');
      if (httpsEl) {
        const secure = location.protocol === 'https:';
        httpsEl.innerHTML = secure ? 'Encrypted <span aria-label="locked">🔒</span>' : 'Not Encrypted <span aria-label="unlocked">🔓</span>';
      }

      // Security headers
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

      // Cloudflare stats
      let j = {};
      try{
        const res = await fetch('/.netlify/functions/cf-stats');
        j = await res.json();
      } catch(e) {
        j = {};
      }

      // Requests served
      const reqsEl = document.getElementById('reqs7d');
      if (reqsEl) {
        const totalReqs = Number(j.requests_7d || 0);
        reqsEl.textContent = totalReqs.toLocaleString();
      }

      // Threats mitigated (7d)
      const thrEl = document.getElementById('threats7d');
      if (thrEl) {
        const threats = Number(j.threats_7d || 0);
        thrEl.textContent = threats.toLocaleString();
      }

      // Top countries
      const countriesEl = document.getElementById('topCountries');
      if (countriesEl) {
        const src = (j.top_countries_30d || []);
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

    }catch(e){
      for(const id of ['reqs7d','threats7d','topCountries']) {
        const el = document.getElementById(id);
        if (el) (el.closest('.card')||el).style.display='none';
      }
    }
  } catch(e) {}
}

function countryFlagEmoji(code){
  if(!code || code.length!==2) return '';
  const A = 0x1F1E6;
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => A + (c.charCodeAt(0)-65)));
}

document.addEventListener('DOMContentLoaded', ()=>{ loadStats(); enhanceClientStats(); loadProjects(); loadLighthouse(); });

// ... keep enhanceClientStats, loadProjects, loadLighthouse from prior fixed version ...
