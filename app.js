async function loadStats(){
  try{
    const r = await fetch('/.netlify/functions/cf-stats');
    const j = await r.json();
    if(!j.enabled) throw new Error(j.reason||'disabled');
    const countries = document.getElementById('topCountries');
    if(countries){
      const arr = j.top_countries_24h||[];
      if(!arr.length){ (countries.closest('.card')||countries).style.display='none'; }
      else{
        countries.innerHTML = arr.slice(0,5).map(c=>`<span class="pill">${c.country} · ${Number(c.count||0).toLocaleString()}</span>`).join(' ');
      }
    }
    const rl = document.getElementById('rateLimited');
    if(rl){
      const data = j.rate_limited_24h;
      if(!data){ (rl.closest('.card')||rl).style.display='none'; }
      else{
        const list = (data.actions||[]).slice(0,4).map(a=>`<span class="pill">${a.action} · ${Number(a.count||0).toLocaleString()}</span>`).join(' ');
        rl.innerHTML = `Total: ${Number(data.total||0).toLocaleString()}${list?' · '+list:''}`;
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
