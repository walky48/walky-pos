'use strict';


/* --- sipariş kalemleri & stok düşümü --- */
function applyRecipe(m,delta){ // delta adet: + eklendi, − çıkarıldı
  if(!db.settings.stockEnabled) return false; // restorana özel ayar — bkz. Kullanıcılar > Ayarlar
  let warn=false;
  (m.recipe||[]).forEach(r=>{
    const s=db.stock.find(x=>x.id===r.s);
    if(!s) return;
    if(s.bottleCl){
      // şişeli takip: reçete miktarı hep cl'dir (bkz. recipeUnit) — toplam cl'den
      // düşülüp adet+açık cl'ye geri bölünür (bir şişe biterse bir sonrakinden
      // otomatik "açılmış" sayılır)
      const total=+(stockTotalCl(s) - r.q*delta).toFixed(3);
      s.qty=Math.floor(total/s.bottleCl);
      s.extraCl=+(total - s.qty*s.bottleCl).toFixed(3);
      if(delta>0 && total<0) warn=true;
    }else{
      s.qty=+(s.qty - r.q*delta).toFixed(3);
      if(delta>0 && s.qty<0) warn=true;
    }
  });
  return warn;
}

function usdFromEur(eur, rates){
  if(!eur || !rates || !rates.USD || !rates.EUR) return 0;
  const raw = eur * (rates.EUR / rates.USD);
  let n = Math.round(raw*1e8); 
  for(let d=8; d>0; d--){
    const last = n % 10;
    n = Math.floor(n/10);
    if(last>=7) n += 1;
  }
  return n;
}
function recalcMenuUsdPrices(){
  db.menu.forEach(m=>{ m.price.USD = usdFromEur(m.price.EUR, db.rates); });
}
function calcTotals(t){
  const sub=t.items.reduce((a,i)=>a+i.qty*i.unit,0);
  let disc=0; if(t.discount) disc = t.discount.type==='pct' ? sub*t.discount.value/100 : Math.min(t.discount.value,sub);
  let serv=0; if(t.service)  serv = t.service.type==='pct'  ? sub*t.service.value/100  : t.service.value;
  const total=Math.max(0, sub-disc+serv);
  return {sub, disc, serv, total, totalTL: total*rateOf(t.currency)};
}

/* --- stok durumu --- */
/* şişeli takip edilen kalemler (bkz. stock.js — adet + açık şişe cl'si) için
   reçete düşümü hep TOPLAM cl üzerinden yapılır. */
function stockTotalCl(s){ return s.bottleCl ? (s.qty||0)*s.bottleCl + (s.extraCl||0) : (s.qty||0); }
function stockLineValue(s){
  if(!s.bottleCl) return (s.qty||0)*(s.price||0);
  return (s.qty||0)*(s.price||0) + (s.bottleCl ? ((s.extraCl||0)/s.bottleCl)*(s.price||0) : 0);
}
function stockName(sid){const s=db.stock.find(x=>x.id===sid);return s?s.name:'?'}
function stockUnit(sid){const s=db.stock.find(x=>x.id===sid);return s?s.unit:''}
/* reçete satırlarında girilen/gösterilen birim — şişeli takip edilen kalemler
   için stoğun kendi birimi 'adet' olsa da reçete her zaman cl üzerinden girilir
   (bir kokteyle "0,07 şişe" değil "5 cl" yazılır). bkz. ui/js/menu.js reçete satırları */
function recipeUnit(sid){ const s=db.stock.find(x=>x.id===sid); if(!s) return ''; return s.bottleCl ? 'cl' : s.unit; }

/* --- bir çekin mutfak (yemek) kalemlerinin, çeke uygulanan indirim düşülmüş
   TL karşılığı. Yüzde indirim tüm kalemlere orantılı düşer; sabit TL indirim
   ise (garsonun tarif ettiği kural gereği) çekteki kalem SAYISINA eşit
   bölünüp her kalemden o pay kadar düşülür. */
function saleKitchenTotalTL(s){
  const kLines=(s.items||[]).filter(i=>KITCHEN_CATS.includes(i.cat));
  if(!kLines.length) return 0;
  const rawSum=a=>a.reduce((x,i)=>x+i.qty*i.unit,0);
  let sub;
  if(s.discount && s.discount.type==='pct'){
    sub = rawSum(kLines) * (1 - s.discount.value/100);
  }else if(s.discount && s.discount.type==='amt' && s.items.length){
    const perLine = s.discount.value / s.items.length;
    sub = kLines.reduce((a,i)=>a + Math.max(0, i.qty*i.unit - perLine), 0);
  }else{
    sub = rawSum(kLines);
  }
  return sub * s.rate;
}

/* --- istatistikler --- */
function computeStats(f,t){
  const S=db.sales.filter(s=>s.bd>=f && s.bd<=t);
  const sum=a=>a.reduce((x,y)=>x+y.totalTL,0);
  const nakit=S.filter(s=>s.method==='nakit');
  const dv=nakit.filter(s=>s.payCur && s.payCur!=='TL');
  const stats={
    ciro:sum(S),
    nakitTL:sum(nakit.filter(s=>s.payCur==='TL')),
    nakitDvTL:sum(dv),
    dvUSD:dv.filter(s=>s.payCur==='USD').reduce((a,s)=>a+s.total,0),
    dvEUR:dv.filter(s=>s.payCur==='EUR').reduce((a,s)=>a+s.total,0),
    kart:sum(S.filter(s=>s.method==='kart')),
    cari:sum(S.filter(s=>s.method==='cari')),
    yemekTL:S.reduce((a,s)=>a+saleKitchenTotalTL(s),0),
    guestK:S.reduce((a,s)=>a+(s.couvert?s.couvert.k:0),0),
    guestE:S.reduce((a,s)=>a+(s.couvert?s.couvert.e:0),0),
    guestC:S.reduce((a,s)=>a+(s.couvert?s.couvert.c:0),0),
    count:S.length, tahN:0, tahK:0, sales:S
  };
  db.cari.forEach(c=>c.entries.forEach(e=>{
    if(e.type==='tahsilat' && e.d>=f && e.d<=t){ if(e.method==='nakit') stats.tahN+=e.amtTL; else stats.tahK+=e.amtTL; }
  }));
  return stats;
}
function payLabel(s){
  if(s.method==='nakit') return 'Nakit ('+(s.payCur==='TL'?'TL':SYM[s.payCur])+')';
  if(s.method==='kart') return 'Kredi Kartı';
  return 'Cari: '+esc(s.cariName||'');
}

/* --- cari (veresiye) --- */
function cariBalance(c){
  let borc=0, tah=0;
  c.entries.forEach(e=>{ if(e.type==='borc') borc+=e.amtTL; else tah+=e.amtTL; });
  return {borc, tah, bal:borc-tah};
}

/* --- menü reçete özeti --- */
function rcpSummary(m){
  if(!m.recipe||!m.recipe.length) return '';
  return m.recipe.map(r=>{
    const q=r.q, unit=recipeUnit(r.s);
    const qs=(unit==='kg'&&q<1)?(q*1000)+' g':String(q).replace('.',',')+' '+unit;
    return esc(stockName(r.s))+' × '+qs;
  }).join(' · ');
}
