
// Utilities
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// Tag color consistency via hash
function tagColor(tag){
  let h = 0; for (let i=0;i<tag.length;i++){ h = (h*31 + tag.charCodeAt(i))>>>0; }
  const hue = h % 360;
  return `hsl(${hue}deg 70% 55%)`;
}

// Populate menus and project grids
async function loadProjects(){
  try{
    const res = await fetch('projects.json', {cache:'no-store'});
    const data = await res.json();
    const general = data.general || [];
    const security = data.security || [];
    const gGrid = $('#general-grid');
    const sGrid = $('#security-grid');
    const gMenu = $('#menu-general');
    const sMenu = $('#menu-security');

    function card(item){
      const div = document.createElement('article');
      div.className='project-card';
      div.id = item.id;
      div.innerHTML = `
        <div class="pc-image">
          <picture>
            ${item.image?.endsWith('.webp') ? `<source srcset="${item.image}" type="image/webp">` : ''}
            <img src="${item.image_fallback || item.image}" alt="${item.title}">
          </picture>
        </div>
        <div class="pc-title">${item.title}</div>
        <div class="pc-summary">${item.summary || ''}</div>
        <div class="pc-tags"></div>
      `;
      const tagsWrap = div.querySelector('.pc-tags');
      (item.tags||[]).forEach(t=>{
        const span=document.createElement('span');
        span.className='tag';
        span.textContent=t;
        span.style.background = tagColor(t);
        tagsWrap.appendChild(span);
      });
      return div;
    }

    function menuItem(item){
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${item.id}">${item.title}</a>`;
      return li;
    }

    general.forEach(it=>{
      gGrid.appendChild(card(it));
      gMenu.appendChild(menuItem(it));
    });
    security.forEach(it=>{
      sGrid.appendChild(card(it));
      sMenu.appendChild(menuItem(it));
    });
  }catch(e){
    console.error('Failed to load projects:', e);
  }
}

// Client-side stats
function getBrowserInfo(){
  const ua = navigator.userAgent;
  let match = ua.match(/(Chrome|Firefox|Safari|Edge)\/([\d\.]+)/);
  if (match) return `${match[1]} ${match[2]}`;
  return ua.split(') ').pop();
}
function getDeviceType(){
  const w = window.innerWidth;
  if (/Mobi|Android/i.test(navigator.userAgent)) return 'Mobile';
  if (w <= 1024) return 'Laptop';
  return 'Desktop';
}
async function detectHeaders(){
  try{
    const res = await fetch(window.location.href, {method:'GET', cache:'no-store'});
    const headers = ['strict-transport-security','content-security-policy','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'];
    const present = headers.map(h => {
      const v = res.headers.get(h);
      return v ? h.toUpperCase().replace(/-/g,'-') : null;
    }).filter(Boolean);
    $('#card-headers .value').textContent = present.length ? present.join('\n') : 'No common security headers detected';
  }catch(e){
    $('#card-headers .value').textContent = 'Headers unavailable';
  }
}

// Cloudflare + Lighthouse
async function loadRemoteStats(){
  try{
    const url = '/.netlify/functions/cf-stats?days=7';
    const r = await fetch(url, {cache:'no-store'});
    const j = await r.json();
    if (j && j.requests_7d != null){
      $('#card-requests .value').textContent = j.requests_7d.toLocaleString();
    }else{
      $('#card-requests .value').textContent = 'No data';
    }
    if (j && j.waf_blocked_7d != null){
      const val = j.waf_blocked_7d;
      $('#card-waf .value').textContent = val ? val.toLocaleString() : 'No blocked events';
    }else{
      $('#card-waf .value').textContent = 'No data/permission';
    }
    // Countries 30d
    try{
      const r2 = await fetch('/.netlify/functions/cf-stats?days=30', {cache:'no-store'});
      const j2 = await r2.json();
      const list = $('#card-countries .list'); list.innerHTML='';
      const arr = j2.top_countries_30d || [];
      if (arr.length){
        arr.slice(0,5).forEach((c,i)=>{
          const li=document.createElement('li');
          const flag = countryFlagEmoji(c.code || c.country);
          li.textContent = `${i+1}. ${flag} ${c.country || c.code} — ${c.requests.toLocaleString()}`;
          list.appendChild(li);
        });
      }else{
        const li=document.createElement('li'); li.textContent='No country breakdown available'; list.appendChild(li);
      }
    }catch(e){ /* ignore */ }
  }catch(e){
    $('#card-requests .value').textContent = 'Unavailable';
    $('#card-waf .value').textContent = 'Unavailable';
    const li=document.createElement('li'); li.textContent='Unavailable'; $('#card-countries .list').appendChild(li);
  }

  // Lighthouse (Netlify API via function)
  try{
    const r = await fetch('/.netlify/functions/netlify-lighthouse', {cache:'no-store'});
    const j = await r.json();
    const el = $('#card-lighthouse .value');
    if (j && j.ok && j.scores){
      const s = j.scores;
      el.textContent = `Perf ${s.performance} | A11y ${s.accessibility} | BP ${s.best_practices} | SEO ${s.seo} | PWA ${s.pwa}`;
    }else if(j && j.message){
      el.textContent = j.message;
    }
  }catch(e){ /* leave default */ }
}

// Country flag emoji from ISO alpha-2 name or full name best-effort
function countryFlagEmoji(name){
  const map = {
    'United States':'US','United Kingdom':'GB','Germany':'DE','Canada':'CA','Australia':'AU'
  };
  const code = (name||'').length===2 ? name.toUpperCase() : (map[name]||'US');
  const A=127397;
  return String.fromCodePoint(...[...code].map(c=>c.charCodeAt(0)+A));
}

// HTTPS lock
function showHttps(){
  const ok = location.protocol === 'https:';
  const v = $('#card-https .value');
  v.textContent = ok ? 'Encrypted' : 'Not encrypted';
}

// Hero fallback guard
function ensureHero(){
  const img = $('#hero-headshot');
  img.addEventListener('error', ()=>{
    img.src = 'assets/images/headshot.jpg';
  }, {once:true});
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadProjects();
  $('#card-browser .value').textContent = getBrowserInfo();
  $('#card-device .value').textContent = getDeviceType();
  showHttps();
  detectHeaders();
  loadRemoteStats();
  ensureHero();
});
