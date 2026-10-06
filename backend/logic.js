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
/* Stok kaleminin takip şeklini değiştirir (bkz. Stok > Düzenle > Şişeli takip).
   bottleCl>0: şişeli takip (adet + açık şişede kalan cl); bottleCl yok/0: sadece
   adet. Tam şişe/adet sayısı (qty) ve fiyat (şişe başı = adet başı) aynı kalır;
   cl cinsinden tutulan uyarı eşikleri (low/crit) şişe boyuyla çevrilir ki "kaç
   şişe" anlamı korunsun. Şişeliden adede geçerken açık şişedeki cl (extraCl) yok
   sayılır ve yok sayılan cl döndürülür; adetten şişeliye geçerken açık cl
   extraCl ile başlar. Zaten şişeli olan kalemde farklı bir şişe boyutu verilirse
   (yanlış girilmiş boyutu düzeltmek için) yalnızca boyut değişir: tam şişe sayısı,
   açık şişedeki cl (extraCl) ve fiyat (şişe başı) aynı kalır, toplam cl yeni boyuta
   göre hesaplanır; low/crit yine "kaç şişe" korunacak şekilde ölçeklenir. Takip
   şekli ve boyut zaten istenen gibiyse hiçbir şey yapmaz.
   Reçetelere DOKUNMAZ: reçete miktarı kalemin takip şekline göre cl ya da adet
   olarak okunur (bkz. recipeUnit) — bir bira reçetesindeki "1" şişeliyken 1 cl,
   sadece adetken 1 adet demektir. */
function setStockTracking(s, bottleCl, extraCl){
  const was=s.bottleCl||0, now=bottleCl>0?+bottleCl:0;
  const scale=(k,f)=>{ if(typeof s[k]==='number') s[k]=+(s[k]*f).toFixed(3); };
  let droppedCl=0;
  if(was && !now){
    droppedCl=s.extraCl||0;
    scale('low',1/was); scale('crit',1/was);
    delete s.bottleCl; delete s.extraCl;
  }else if(!was && now){
    s.bottleCl=now; s.extraCl=extraCl||0;
    scale('low',now); scale('crit',now);
  }else if(was && now && was!==now){
    s.bottleCl=now;
    scale('low',now/was); scale('crit',now/was);
  }
  return droppedCl;
}
/* bir stok kalemini kullanan menü reçete satırları (ürün reçetesi + seçenek ekleri) */
function stockRecipeUses(sid){
  const out=[];
  (db.menu||[]).forEach(m=>{
    (m.recipe||[]).forEach(r=>{ if(r.s===sid) out.push({menu:m.name, q:r.q}); });
    (m.variants||[]).forEach(v=>(v.extra||[]).forEach(r=>{ if(r.s===sid) out.push({menu:m.name+' ('+v.label+')', q:r.q}); }));
  });
  return out;
}

/* --- Genel Stok: tüketim raporu --- */
/* Ayrı bir "tüketim logu" tutmuyoruz — sipariş ekranındaki her +1/-1 düzeltmeyi
   loglamak (bkz. ui/js/order.js applyRecipe çağrıları) çok gürültülü ve gereksiz
   olurdu, çünkü siparişten silinen bir kalem zaten net sıfıra döner. Bunun yerine
   GERÇEKTEN satılmış (db.sales'e düşmüş) kalemler üzerinden, o kalemin reçetesi
   uygulanarak geriye dönük hesaplanır — tarih aralığı filtresi zaten db.sales'in
   'bd' alanıyla computeStats()'taki gibi çalışır. Reçete SONRADAN değiştiyse eski
   satışlar güncel reçeteyle yaklaşık hesaplanır; bu, basit tutmak için bilinçli
   bir sadeleştirme (Fark/varyans analizi kapsam dışı bırakıldı). */
function resolveSaleItemRecipe(item){
  if(item.recipe) return item.recipe;
  if(item.mid){
    const m=db.menu.find(x=>x.id===item.mid);
    if(!m) return [];
    if(item.variant){
      const v=(m.variants||[]).find(x=>x.label===item.variant);
      if(v) return [...(m.recipe||[]), ...(v.extra||[])];
    }
    return m.recipe||[];
  }
  // mid/variant saklanmadan önceki eski satış kayıtları — isimden çözümlemeye çalış
  // (varyant kalemleri "Ürün — Varyant" olarak kaydedilir, bkz. ui/js/order.js addLine)
  const sep=' — ', idx=item.name.indexOf(sep);
  if(idx>=0){
    const base=item.name.slice(0,idx), label=item.name.slice(idx+sep.length);
    const m=db.menu.find(x=>x.name===base);
    if(!m) return [];
    const v=(m.variants||[]).find(x=>x.label===label);
    return v ? [...(m.recipe||[]), ...(v.extra||[])] : (m.recipe||[]);
  }
  const m=db.menu.find(x=>x.name===item.name);
  return m?(m.recipe||[]):[];
}
function consumptionInRange(f,t){
  const agg={}; // stok id -> tüketilen miktar (recipeUnit cinsinden, ör. cl/adet/kg)
  db.sales.filter(s=>s.bd>=f && s.bd<=t).forEach(sale=>{
    (sale.items||[]).forEach(item=>{
      resolveSaleItemRecipe(item).forEach(r=>{
        agg[r.s]=+((agg[r.s]||0)+r.q*item.qty).toFixed(3);
      });
    });
  });
  return agg;
}
function consumedValue(s, consumedQty){
  if(!consumedQty) return 0;
  if(s.bottleCl) return (consumedQty/s.bottleCl)*(s.price||0);
  return consumedQty*(s.price||0);
}

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
