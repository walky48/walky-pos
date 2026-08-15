'use strict';
/* ============================================================
   WALKY POS — iş kuralları: stok düşümü, toplam hesaplama,
   istatistik hesaplama, cari bakiye
   ============================================================ */

/* --- sipariş kalemleri & stok düşümü --- */
function applyRecipe(m,delta){ // delta adet: + eklendi, − çıkarıldı
  let warn=false;
  (m.recipe||[]).forEach(r=>{
    const s=db.stock.find(x=>x.id===r.s);
    if(!s) return;
    s.qty=+(s.qty - r.q*delta).toFixed(3);
    if(delta>0 && s.qty<0) warn=true;
  });
  return warn;
}
/* --- Euro fiyatından Dolar hesaplama (özel yukarı-eğilimli yuvarlama) ---
   Kural: ondalık basamaklar sondan başa doğru teker teker değerlendirilir;
   basamak 7-8-9 ise yukarı yuvarlanıp bir önceki basamağa taşınır, 0-6 ise
   direkt atılır. Tüm ondalıklar bitene kadar tekrarlanır, sonuç tam dolar olur. */
function usdFromEur(eur, rates){
  if(!eur || !rates || !rates.USD || !rates.EUR) return 0;
  const raw = eur * (rates.EUR / rates.USD);
  let n = Math.round(raw*1e8); // 8 ondalık basamak hassasiyetle tam sayıya ölçekle
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
function stockStatus(s){return s.qty<=s.crit?'crit' : s.qty<=s.low?'low' : 'ok'}
const ST_LBL={ok:'Normal', low:'Azalıyor', crit:'Kritik'};
function stockName(sid){const s=db.stock.find(x=>x.id===sid);return s?s.name:'?'}
function stockUnit(sid){const s=db.stock.find(x=>x.id===sid);return s?s.unit:''}

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
  if(!m.recipe||!m.recipe.length) return 'Reçete yok — stok düşümü yapılmaz';
  return m.recipe.map(r=>{
    const q=r.q, unit=stockUnit(r.s);
    const qs=(unit==='kg'&&q<1)?(q*1000)+' g':String(q).replace('.',',')+' '+unit;
    return esc(stockName(r.s))+' × '+qs;
  }).join(' · ');
}
