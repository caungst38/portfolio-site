
// v38.3.3 baseline helpers
(function(){
  const $ = (s,ctx=document)=>ctx.querySelector(s);
  const $$=(s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

  // Footer year
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // UA / Device
  const ua = navigator.userAgent;
  const uaInfo = document.getElementById('uaInfo');
  if(uaInfo) uaInfo.textContent = ua.split(') ')[0].replace('(','') || navigator.userAgent;

  const deviceType = document.getElementById('deviceType');
  if(deviceType){
    const w = Math.max(screen.width, screen.height);
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua) || w < 768;
    deviceType.textContent = isMobile ? 'Mobile' : (w < 1100 ? 'Laptop' : 'Desktop');
  }

  // HTTPS
  const httpsState = document.getElementById('httpsState');
  if(httpsState){
    const ok = location.protocol === 'https:';
    httpsState.textContent = ok ? 'Yes (TLS)' : 'No';
  }

  // Security headers check (client-visible subset)
  const secHeaders = document.getElementById('secHeaders');
  if(secHeaders){
    const pills = ['Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Content-Security-Policy','Referrer-Policy'];
    secHeaders.innerHTML = pills.map(h=>`<span class="pill">${h}</span>`).join('');
  }

  // Chip filter (client-side stub, awaits project injection)
  const chips = $$('.chip');
  chips.forEach(ch=>ch.addEventListener('click',()=>{
    const f = ch.dataset.filter;
    const tiles = $$('.tile');
    tiles.forEach(t=>{
      t.style.display = (f==='All'||!f) ? '' : (t.dataset.tags?.includes(f) ? '' : 'none');
    });
    chips.forEach(c=>c.classList.remove('active')); ch.classList.add('active');
  }));

  // Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImage');
  const lbCap = document.getElementById('lightboxCaption');
  const lbClose = document.querySelector('.lightbox-close');
  if(lb && lbClose){
    lbClose.addEventListener('click',()=>lb.classList.remove('open'));
    lb.addEventListener('click',(e)=>{ if(e.target===lb) lb.classList.remove('open'); });
  }

  // Inject sample projects & certs based on provided assets
      ];
    items.forEach(it=>{
      const el = document.createElement('article');
      el.className='tile'; el.dataset.tags = it.tags;
      el.innerHTML = `
        <div class="thumb"><img src="${it.img}" alt="${it.title}"></div>
        <div class="body"><h3>${it.title}</h3><p>${it.desc}</p></div>`;
      el.addEventListener('click',()=>{
        lbImg.src = it.img; lbCap.textContent = it.title; lb.classList.add('open');
      });
      general.appendChild(el);
    });
  }

  function addCerts(){
    const certs = document.getElementById('certifications');
    if(!certs) return;
    const el = document.createElement('article');
    el.className='tile';
    el.innerHTML = `<div class="thumb"><img src="assets/images/certs/comptia-networkplus.jpg" alt="CompTIA Network+"></div>
                    <div class="body"><h3>CompTIA Network+</h3><p>In progress</p></div>`;
    certs.appendChild(el);
  }

  addCerts();
})();
