
async function fetchJSON(path){
  const r = await fetch(path);
  if(!r.ok) throw new Error(`Failed to fetch ${path}`);
  return r.json();
}
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }

function renderProjects(containerId, items){
  const root = document.getElementById(containerId);
  if(!root) return;
  const frag = document.createDocumentFragment();
  for(const p of items){
    const imgSrc = p.image;
    const card = el(`<article class="card project-card">
      <img src="${imgSrc}" alt="${p.title} preview" loading="lazy"/>
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      <div class="tags">${(p.tags||[]).map(t=>`<span class="pill">${t}</span>`).join(' ')}</div>
    </article>`);
    card.addEventListener('click', ()=>openLightbox(imgSrc, p.title));
    frag.appendChild(card);
  }
  root.innerHTML = "";
  root.appendChild(frag);
}

function openLightbox(src, caption){
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImage').src = src;
  document.getElementById('lightboxCaption').textContent = caption || '';
  lb.setAttribute('aria-hidden','false');
}
document.addEventListener('click', (e)=>{
  if(e.target.closest('.lightbox-close') || (e.target.id==='lightbox')){
    document.getElementById('lightbox').setAttribute('aria-hidden','true');
  }
});

async function loadProjects(){
  try{
    const data = await fetchJSON('projects.json');
    renderProjects('generalProjects', data.general||[]);
    renderProjects('securityProjects', data.security||[]);
  }catch(e){
    console.error('Projects load failed', e);
  }
}

async function loadStats(){
  const setStatus = (txt)=>{ const el=document.getElementById('cfStatus'); if(el) el.textContent = txt; };
  try{
    const r = await fetch('/.netlify/functions/cf-stats?days=7');
    if(!r.ok) throw new Error('cf-stats http '+r.status);
    const j = await r.json();
    if(!j || j.enabled===false) throw new Error(j?.reason||j?.error||'disabled');

    setStatus('Connected');

    const countriesEl = document.getElementById('topCountries');
    if(countriesEl){
      const arr = j.top_countries_24h || [];
      countriesEl.innerHTML = arr.slice(0,5).map(c=>`<span class="pill">${c.country} · ${Number(c.count||0).toLocaleString()}</span>`).join(' ');
      if(!arr.length){ (countriesEl.closest('.card')||countriesEl).style.display='none'; }
    }
    const rlEl = document.getElementById('rateLimited');
    if(rlEl){
      const data = j.rate_limited_24h || { total: 0, actions: [] };
      const list = (data.actions||[]).slice(0,4).map(a=>`<span class="pill">${a.action} · ${Number(a.count||0).toLocaleString()}</span>`).join(' ');
      rlEl.innerHTML = `Total: ${Number(data.total||0).toLocaleString()}${list ? ' · ' + list : ''}`;
      if(!data.total){ (rlEl.closest('.card')||rlEl).style.display='none'; }
    }
  }catch(e){
    setStatus('Unavailable');
    for(const id of ['topCountries','rateLimited']){
      const el=document.getElementById(id);
      if(el) (el.closest('.card')||el).style.display='none';
    }
    console.error('cf-stats failed', e);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('year').textContent = new Date().getFullYear();
  loadProjects();
  loadStats();
});
