/* ===== v69: Active nav highlight by section ===== */
(function(){
  try{
    const navLinks = Array.from(document.querySelectorAll('.topbar .nav .nav-item > a[href^="#"]'));
    const byHash = new Map(navLinks.map(a => [a.getAttribute('href'), a]));
    const targets = navLinks
      .map(a => a.getAttribute('href'))
      .filter(h => h && h.startsWith('#'))
      .map(h => document.querySelector(h))
      .filter(Boolean);

    function setActive(idHash){
      navLinks.forEach(a => a.classList.remove('active'));
      const link = byHash.get(idHash);
      if(link) link.classList.add('active');
    }

    if('IntersectionObserver' in window && targets.length){
      let current = null;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if(e.isIntersecting){
            current = '#' + (e.target.id || '');
          }
        });
        if(current) setActive(current);
      }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] });
      targets.forEach(t => io.observe(t));
    }

    // Also set on hash change / initial load
    window.addEventListener('hashchange', () => setActive(location.hash));
    if(location.hash) setActive(location.hash);
  }catch(e){ /* no-op */ }
})();
