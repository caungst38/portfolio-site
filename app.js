async function loadStats(){
  try{
    const r = await fetch('/.netlify/functions/cf-stats');
    const j = await r.json();
    if(!j || j.enabled === false) throw new Error(j && j.reason ? j.reason : 'cf disabled');

    const countriesEl = document.getElementById('topCountries');
    if (countriesEl) {
      const arr = Array.isArray(j.top_countries_24h) ? j.top_countries_24h.slice(0,5) : [];
      if(!arr.length){
        (countriesEl.closest('.card')||countriesEl).style.display='none';
      } else {
        countriesEl.innerHTML = arr.map(c => {
          const name = c.country || 'Unknown';
          const count = Number(c.count||0).toLocaleString();
          return `<span class="pill">${name} · ${count}</span>`;
        }).join(' ');
      }
    }

    const rlEl = document.getElementById('rateLimited');
    if (rlEl) {
      const data = j.rate_limited_24h;
      if (!data || !data.total) {
        (rlEl.closest('.card')||rlEl).style.display='none';
      } else {
        const list = (data.actions||[]).slice(0,4).map(a => `<span class="pill">${a.action} · ${Number(a.count||0).toLocaleString()}</span>`).join(' ');
        rlEl.innerHTML = `Total: ${Number(data.total||0).toLocaleString()}${list ? ' · ' + list : ''}`;
      }
    }
  }catch(e){
    for(const id of ['topCountries','rateLimited']){
      const el=document.getElementById(id);
      if(el) (el.closest('.card')||el).style.display='none';
    }
  }
}
document.addEventListener('DOMContentLoaded', loadStats);