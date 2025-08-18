
function byId(id){return document.getElementById(id);}
function hideCard(id){ const el = byId(id); if(!el) return; const card = el.closest('.card') || el.parentElement; if(card) card.style.display='none'; }

// Utilities
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const byId = id => document.getElementById(id);
const year = byId('year'); if (year) year.textContent = new Date().getFullYear();

// Tag colors
const TAG_COLORS = {
  'Web':'#2bb0d6','Cloud':'#9ad7ff','Networking':'#22c55e','Scripting':'#ffd166',
  'Security — Offense':'#f43f5e','Security — Defense':'#60a5fa','Governance':'#a78bfa','Tooling/DevOps':'#2dd4bf','Misc':'#94a3b8',
  'HTML':'#2bb0d6','CSS':'#9ad7ff','JavaScript':'#ffd166','Netlify':'#2dd4bf','Cloudflare':'#f97316','DNS':'#a78bfa','WAF':'#ef4444','TLS':'#22c55e','CI/CD':'#67e8f9',
  'Hardware':'#f59e0b','PC Build':'#fb7185','Windows':'#60a5fa','UEFI':'#f472b6','Secure Boot':'#10b981','TPM':'#7dd3fc'
};

function chip(label){
  const span = document.createElement('span');
  span.className = 'pill';
  span.textContent = label;
  const c = TAG_COLORS[label];
  if (c) { span.style.borderColor = c; span.style.boxShadow = `0 0 0 1px ${c} inset`; }
  return span;
}

function renderTagLegend(tags){
  const el = byId('tagLegend'); if (!el) return;
  el.innerHTML = '';
  tags.forEach(t => el.appendChild(chip(t)));
}

// Lightbox
const lb = byId('lightbox'), lbImg = byId('lightboxImage'), lbCap = byId('lightboxCaption');
const lbPdf = byId('lightboxPdf'), lbRepo = byId('lightboxRepo');
$('.lightbox-close').addEventListener('click', ()=> lb.classList.remove('show'));
lb.addEventListener('click', e=>{ if(e.target===lb) lb.classList.remove('show'); });

function openLightbox({image, title, description, pdf, repo}){
  lbImg.src = image;
  lbImg.alt = title + ' screenshot';
  lbCap.textContent = description || '';
  lb.classList.add('show');
  if (pdf){ lbPdf.href = pdf; lbPdf.hidden=false; } else lbPdf.hidden=true;
  if (repo){ lbRepo.href = repo; lbRepo.hidden=false; } else lbRepo.hidden=true;
}

// Data
let PROJECT_DATA = { general:[], security:[] };

async function loadJSON(path){
  try{
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }catch(e){
    console.error('JSON load failed:', path, e);
    return null;
  }
}

function projectCard(item){
  const card = document.createElement('article');
  card.className = 'card project';
  card.innerHTML = `
    <img src="${item.image}" alt="${item.title}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:10px;border:1px solid var(--border)">
    <h3>${item.title}</h3>
    <p>${item.description}</p>`;
  const tags = document.createElement('div'); tags.className='pill-list';
  (item.tags||[]).forEach(t=> tags.appendChild(chip(t)));
  card.appendChild(tags);
  card.addEventListener('click', ()=> openLightbox(item));
  return card;
}

function certCard(item){
  const el = document.createElement('article');
  el.className = 'cert-card';
  el.innerHTML = `
    <img src="${item.image}" alt="${item.title}">
    <div><strong>${item.title}</strong></div>
    <small>Issuer: ${item.issuer||''}</small>`;
  return el;
}

function renderProjects(filterTag='All'){
  const g = byId('projects-general'), s = byId('projects-security');
  g.innerHTML=''; s.innerHTML='';
  const passes = p => (filterTag==='All' || (p.tags||[]).includes(filterTag));
  PROJECT_DATA.general.filter(passes).forEach(p=> g.appendChild(projectCard(p)));
  PROJECT_DATA.security.filter(passes).forEach(p=> s.appendChild(projectCard(p)));
}

async function hydrateProjects(){
  const data = await loadJSON('projects.json');
  const err = byId('projects-general-error');
  if(!data){ err.textContent = 'Could not load projects.json (check file path or deploy).'; return; }
  err.textContent = '';
  PROJECT_DATA = data;
  renderProjects('All');

  // Build nav dropdowns
  const gm = byId('generalMenu'), sm = byId('securityMenu');
  gm.innerHTML = (data.general||[]).map(p=> `<a href="#general" data-title="${p.title}">${p.title}</a>`).join('');
  sm.innerHTML = (data.security||[]).map(p=> `<a href="#security" data-title="${p.title}">${p.title}</a>`).join('');
  gm.querySelectorAll('a').forEach(a=> a.addEventListener('click', (e)=>{
    e.preventDefault(); const t = a.dataset.title; 
    const card = [...byId('projects-general').children].find(c => c.querySelector('h3').textContent===t);
    if(card){ card.scrollIntoView({behavior:'smooth', block:'center'}); card.classList.add('pulse'); setTimeout(()=>card.classList.remove('pulse'),1000); }
  }));
  sm.querySelectorAll('a').forEach(a=> a.addEventListener('click', (e)=>{
    e.preventDefault(); const t = a.dataset.title; 
    const card = [...byId('projects-security').children].find(c => c.querySelector('h3').textContent===t);
    if(card){ card.scrollIntoView({behavior:'smooth', block:'center'}); card.classList.add('pulse'); setTimeout(()=>card.classList.remove('pulse'),1000); }
  }));

  // Tag legend
  const uniq = new Set();
  (data.general||[]).concat(data.security||[]).forEach(p => (p.tags||[]).forEach(t=> uniq.add(t)));
  renderTagLegend([...uniq]);
}

async function hydrateCerts(){
  const certs = await loadJSON('certifications.json');
  const c = byId('certifications');
  if(!certs){ c.innerHTML = '<div class="error">Could not load certifications.json</div>'; return; }
  c.innerHTML='';
  certs.forEach(x=> c.appendChild(certCard(x)));
}

// Chip filtering
function setupChips(){
  $$('.chip').forEach(btn => {
    btn.addEventListener('click', ()=>{
      $$('.chip').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });
  const first = $('.chip'); if(first) first.classList.add('active');
}

// Stats
function setHTTPS(){ byId('httpsState').textContent = location.protocol === 'https:' ? 'HTTPS ✓' : 'HTTP'; }
async function setHeaders(){
  const r = await fetch('style.css',{cache:'no-store'});
  const list = ['CSP','HSTS','XFO','XCTO','Referrer','Permissions'];
  const pillC = byId('secHeaders'); pillC.innerHTML='';
  list.forEach(h=> pillC.appendChild(chip(h)));
  const cache = r.headers.get('cf-cache-status') || r.headers.get('x-cache') || '—';
  byId('cacheStatus').textContent = cache;
}
async function setCF(){
  try{
    const r = await fetch('/.netlify/functions/cf-stats');
    if(r.status===404){ byId('cfStatus').textContent = 'Function not deployed'; return; }
    const j = await r.json();
    byId('cfStatus').textContent = j.enabled ? `Pageviews 7d: ${j.pageviews_7d} • Uniques 7d: ${j.uniques_7d}` : `Disabled: ${j.reason||'—'}`;
    setCountries(j.top_countries_24h);
    setRateLimited(j.rate_limited_24h);

  }catch(e){ byId('cfStatus').textContent = 'Error'; }
}


async function setCountries(list){
  const el = byId('topCountries');
  if(!list || !list.length){ el.textContent = '—'; return; }
  el.innerHTML = list.slice(0,5).map(x => `<div class="pill">${x.country} · ${x.requests}</div>`).join(' ');
}
async function setRateLimited(obj){
  const el = byId('rateLimited');
  if(!obj){ el.textContent = '—'; return; }
  const total = (obj.total||0);
  const breakdown = (obj.actions||[]).slice(0,4).map(a => `<span class="pill">${a.action} · ${a.count}</span>`).join(' ');
  el.innerHTML = `Total: ${total} ${breakdown ? '· ' + breakdown : ''}`;
}

document.addEventListener('DOMContentLoaded', ()=>{
  hydrateProjects();
  hydrateCerts();
  setupChips();
  setHTTPS();
  setHeaders();
  setCF();
});
