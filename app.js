const $ = (sel, ctx=document) => ctx.querySelector(sel);

const tagColors = {};
function colorFor(tag){
  const key = tag.toLowerCase();
  if(!tagColors[key]){
    const palette = ['#5ad1ff','#52ffb8','#ffb452','#ce7aff','#ffd166','#8affc1','#a9b1ff','#ff89a7'];
    tagColors[key] = palette[Object.keys(tagColors).length % palette.length];
  }
  return tagColors[key];
}

async function loadProjects(){
  const res = await fetch('projects.json');
  const data = await res.json();
  const add = (arr, gridId, ddId)=>{
    const grid = document.getElementById(gridId);
    const dd = document.getElementById(ddId);
    grid.innerHTML=''; dd.innerHTML='';
    arr.forEach(p=>{
      const card = document.createElement('div');
      card.className='card project-card'; card.id=p.id;
      card.innerHTML = `
        <img src="${p.image}" alt="${p.title}" onerror="this.onerror=null; this.src='assets/images/projects/placeholder-project.webp'">
        <h3>${p.title}</h3>
        <p>${p.summary||''}</p>
        <div class="tags">${(p.tags||[]).map(t=>`<span class="tag" style="background:${colorFor(t)}22;border-color:${colorFor(t)}44;color:${colorFor(t)}">${t}</span>`).join('')}</div>
        ${p.links && p.links.length ? `<p>${p.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join(' · ')}</p>` : ''}
      `;
      grid.appendChild(card);
      const a = document.createElement('a');
      a.href = '#'+p.id; a.textContent=p.title; dd.appendChild(a);
    });
  };
  add(data.general, 'general-grid', 'dd-general');
  add(data.security, 'security-grid', 'dd-security');
}
loadProjects();

function detectBrowser(){
  const ua = navigator.userAgent;
  let browser='Unknown', version='';
  const m = ua.match(/(Edg|Chrome|Safari|Firefox|OPR|Brave|MSIE|Trident)\/?([\d.]+)/);
  if(m){
    const map = {Edg:'Edge', OPR:'Opera'};
    browser = map[m[1]] || m[1]; if(browser==='Trident') browser='IE';
    version = m[2];
  }
  return browser + (version? ' ' + version : '');
}
function detectDevice(){
  const w = Math.max(screen.width, screen.height);
  if (/Mobi|Android/i.test(navigator.userAgent)) return 'Mobile';
  if (w>=1600) return 'Desktop';
  return 'Laptop';
}
async function detectHeaders(){
  try{
    const res = await fetch(window.location.href, { method:'GET', cache:'no-store' });
    const headers = ['strict-transport-security','content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'];
    const found = headers.filter(h => res.headers.get(h));
    return found.length? found.map(h=>h.toUpperCase()).join(', ') : 'None detected';
  }catch(e){ return 'Unavailable'; }
}
function setStat(key, v){
  const el = document.querySelector(`[data-fill="${key}"]`);
  if(!el) return;
  if(key==='lighthouse') el.innerHTML = v;
  else el.textContent = v;
}
async function loadCF(days=7){
  try{
    const res = await fetch(`/.netlify/functions/cf-stats?days=${days}`);
    const j = await res.json();
    if(j && j.enabled){
      setStat('requests_week', (j.requests_week||0).toLocaleString());
      setStat('waf_blocked', (j.waf_blocked_week||0).toLocaleString());
      const countries = (j.top_countries_30d||[]).map((c,i)=>`${i+1}. ${flag(c.country)} ${c.country} — ${c.visits.toLocaleString()}`).join('\n');
      setStat('countries', countries || 'No data');
    } else {
      setStat('requests_week', 'Unavailable');
      setStat('waf_blocked', 'Unavailable');
      setStat('countries', 'Unavailable');
    }
  }catch(e){
    setStat('requests_week','Error'); setStat('waf_blocked','Error'); setStat('countries','Error');
  }
}
async function loadLighthouse(){
  try{
    const res = await fetch('/.netlify/functions/netlify-lighthouse');
    const j = await res.json();
    if(j && j.enabled){
      const s = j.scores || {};
      const circle = (label, val)=>`<div style="display:inline-block;margin-right:10px;text-align:center"><div style="width:48px;height:48px;border-radius:50%;border:4px solid ${scoreColor(val)};line-height:40px;font-weight:700">${val}</div><div style="font-size:.75rem;color:#9fb3c8">${label}</div></div>`;
      const html = `${circle('Perf', s.performance)}${circle('A11y', s.accessibility)}${circle('Best', s.bestPractices)}${circle('SEO', s.seo)}${circle('PWA', s.pwa)}`;
      setStat('lighthouse', html);
    } else {
      setStat('lighthouse','Connect Netlify API');
    }
  }catch(e){ setStat('lighthouse','Unavailable'); }
}
function scoreColor(v){ if(v>=90) return '#0cce6b'; if(v>=50) return '#ffa400'; return '#ff4e42'; }
function flag(country){
  const map = {'United States':'🇺🇸','Canada':'🇨🇦','United Kingdom':'🇬🇧','Germany':'🇩🇪','France':'🇫🇷','India':'🇮🇳','Australia':'🇦🇺'};
  return map[country] || '🏳️';
}

(function init(){
  setStat('browser', detectBrowser());
  setStat('device', detectDevice());
  const secure = window.isSecureContext || location.protocol === 'https:';
  const lock = document.querySelector('[data-fill="lock"]'); if(lock) lock.textContent = secure? '🔒' : '🔓';
  setStat('https', secure? 'Encrypted' : 'Not encrypted');
  detectHeaders().then(v=> setStat('headers', v));
  loadCF(7);
  loadLighthouse();
})();
