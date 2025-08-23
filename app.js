
/* app.js — updated to provide full Browser + OS details in #uaInfo and populate reqs7d/waf7d */

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
      let j = {};
      try{
        const res = await fetch('/.netlify/functions/cf-stats');
        j = await res.json();
      } catch(e) {
        j = {};
      }

      // Connection status (optional element may not exist)
      const cfEl = document.getElementById('cfStatus');
      if (cfEl) {
        const ok = !!(j && (j.ok || j.enabled));
        cfEl.textContent = ok ? 'Connected' : ((j && j.reason) || 'Unavailable');
      }

      // Requests served (7d)
      const reqsEl = document.getElementById('reqs7d');
      if (reqsEl) {
        const totalReqs = Number(j.requests_7d || j.requests || 0);
        if (totalReqs > 0) reqsEl.textContent = totalReqs.toLocaleString();
        else reqsEl.textContent = '0';
      }

      // WAF blocked (7d)
      const wafEl = document.getElementById('waf7d');
      if (wafEl) {
        const blocked = Number(j.waf_blocked_7d || j.blocked || 0);
        wafEl.textContent = blocked.toLocaleString();
      }

      // Top countries
      const countriesEl = document.getElementById('topCountries');
      if (countriesEl) {
        const src = (j.top_countries_30d || j.top_countries_24h || []);
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
      // Hide dynamic cards on failure
      for(const id of ['topCountries','cfStatus','reqs7d','waf7d']) {
        const el = document.getElementById(id);
        if (el) (el.closest('.card')||el).style.display='none';
      }
    }
  } catch(e) {
    // swallow
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

// --- Client Stats ---
// Robust browser/OS detection with UA-CH fallback to UA parsing
function parseBrowserFromUA(ua) {
  let name = 'Unknown', version = '';
  const rx = (re) => (ua.match(re) || [])[1];

  if (/Edg\//.test(ua))      { name = 'Edge'; version = rx(/Edg\/([\d.]+)/); }
  else if (/OPR\//.test(ua)) { name = 'Opera'; version = rx(/OPR\/([\d.]+)/); }
  else if (/Chrome\//.test(ua)) { name = 'Chrome'; version = rx(/Chrome\/([\d.]+)/); }
  else if (/Firefox\//.test(ua)) { name = 'Firefox'; version = rx(/Firefox\/([\d.]+)/); }
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    name = 'Safari'; version = rx(/Version\/([\d.]+)/) || rx(/Safari\/([\d.]+)/);
  }
  return version ? `${name} ${version}` : name;
}

function parseOSFromUA(ua) {
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua))   return 'macOS';
  if (/Android/.test(ua))    return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Linux/.test(ua))      return 'Linux';
  return 'Unknown';
}

async function detectBrowserDetails() {
  const ua = navigator.userAgent || '';
  const uaData = navigator.userAgentData;

  if (uaData?.getHighEntropyValues) {
    try {
      const high = await uaData.getHighEntropyValues(['platform','platformVersion','uaFullVersion']);
      const brands = (navigator.userAgentData.brands || []).filter(b => !/not.?a.?brand/i.test(b.brand));
      const primary = brands[0];
      const browser = primary ? `${primary.brand} ${primary.version}` :
                      high.uaFullVersion ? `Chromium ${high.uaFullVersion}` : parseBrowserFromUA(ua);
      const os = [high.platform, high.platformVersion].filter(Boolean).join(' ') || parseOSFromUA(ua);
      return { browser, os };
    } catch(e) {
      // fall through
    }
  }

  return { browser: parseBrowserFromUA(ua), os: parseOSFromUA(ua) };
}

async function enhanceClientStats(){
  // Browser + OS
  const uaEl = document.getElementById('uaInfo');
  if (uaEl){
    try{
      const info = await detectBrowserDetails();
      const text = info.browser && info.os ? `${info.browser} on ${info.os}` :
                   info.browser || info.os || 'Unknown';
      uaEl.textContent = text;
    }catch(e){
      const ua = navigator.userAgent;
      uaEl.textContent = ua || 'Unknown';
    }
  }

  // Device type
  const devEl = document.getElementById('deviceType');
  if (devEl){
    const ua = (navigator.userAgent || '').toLowerCase();
    const isTablet = /ipad|tablet/.test(ua);
    const isMobile = /mobile|iphone|android/.test(ua) && !isTablet;
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
