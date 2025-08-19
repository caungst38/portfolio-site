
async function loadStats(){
  try{
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

document.addEventListener('DOMContentLoaded', ()=>{ loadStats(); enhanceClientStats(); loadProjects(); loadLighthouse(); });


async function loadProjects(){
  try{
    const res = await fetch('projects.json', { cache:'no-store' });
    const data = await res.json();
    const gen = data.general || [];
    const sec = data.security || [];

    const tagColor = (function(){
      const map = new Map();
      const colors = ['#7bdff2','#b2f7ef','#eff7f6','#f7d6e0','#f2b5d4','#cdb4db','#ffc8dd','#ffafcc','#bde0fe','#a2d2ff'];
      return (t)=>{
        const k = t.toLowerCase().trim();
        if (!map.has(k)) map.set(k, colors[map.size % colors.length]);
        return map.get(k);
      };
    })();

    function cardHTML(p, idx, section){
      const anchor = `${section}-card-${idx}`;
      const tags = (p.tags||[]).map(t=>`<span class="pill" style="background:${tagColor(t)}22;border-color:${tagColor(t)}44;color:${tagColor(t)}">${t}</span>`).join(' ');
      return `<article class="card project" id="${anchor}">
        <div class="project-inner">
          <div class="project-image">
            <img src="${p.image||'assets/images/projects/placeholder-project.webp'}" alt="${p.title} image" loading="lazy"/>
          </div>
          <div class="project-summary">
            <h3>${p.title}</h3>
            <p>${p.description||''}</p>
          </div>
          <div class="project-tags">${tags}</div>
        </div>
      </article>`;
    }

    const genRoot = document.getElementById('projects-general');
    if (genRoot) genRoot.innerHTML = gen.map((p,i)=>cardHTML(p,i,'gen')).join('');

    const secRoot = document.getElementById('projects-security');
    if (secRoot) secRoot.innerHTML = sec.map((p,i)=>cardHTML(p,i,'sec')).join('');

    // Populate dropdown menus
    const genMenu = document.getElementById('generalMenu');
    if (genMenu) genMenu.innerHTML = gen.map((p,i)=>`<a href="#gen-card-${i}">${p.title}</a>`).join('');
    const secMenu = document.getElementById('securityMenu');
    if (secMenu) secMenu.innerHTML = sec.map((p,i)=>`<a href="#sec-card-${i}">${p.title}</a>`).join('');
  }catch(e){
    const el = document.getElementById('projects-general-error');
    if (el) el.textContent = 'Could not load projects.';
  }
}

async function enhanceClientStats(){
  const uaEl = document.getElementById('uaInfo');
  if (uaEl){
    const ua = navigator.userAgent;
    uaEl.textContent = ua || 'Unknown';
  }
  const devEl = document.getElementById('deviceType');
  if (devEl){
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|iphone|android|ipad/.test(ua);
    const isTablet = /ipad|tablet/.test(ua);
    const device = isMobile ? 'Mobile' : (isTablet ? 'Tablet' : 'Desktop/Laptop');
    devEl.textContent = device;
  }
}

async function loadLighthouse(){
  const el = document.getElementById('lighthouseScores');
  if (!el) return;
  try{
    const r = await fetch('/.netlify/functions/netlify-lighthouse', { cache:'no-store' });
    const j = await r.json();
    if (j && j.ok && j.scores){
      const S = j.scores;
      const circle = (v,label)=>`<div class="lh-metric"><div class="lh-circle">${v??'—'}</div><span>${label}</span></div>`;
      el.innerHTML = circle(S.performance,'Performance') + circle(S.accessibility,'Accessibility') + circle(S.best_practices,'Best Practices') + circle(S.seo,'SEO') + circle(S.pwa,'PWA');
    }else{
      el.textContent = j && j.reason ? j.reason : 'Connect Netlify API';
    }
  }catch{ el.textContent = 'Connect Netlify API'; }
}
