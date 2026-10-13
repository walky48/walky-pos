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
/* Ürün bazlı ikram: satırın ikram alanı ({name, by}) doluysa o satır ücretsizdir.
   sub: tüm kalemler (ikramlılar dahil); ik: ikram edilen kalemlerin tutarı; dsc: masa
   indirimi (yalnızca ikramsız kalemler üzerinden, servis ücreti de öyle); disc =
   ik + dsc (toplam düşüş), yani total = sub − disc + serv her zaman geçerli. */
function calcTotals(t){
  const sub=t.items.reduce((a,i)=>a+i.qty*i.unit,0);
  const ik=t.items.reduce((a,i)=>a+(i.ikram?i.qty*i.unit:0),0), base=sub-ik;
  let dsc=0; if(t.discount) dsc = t.discount.type==='pct' ? base*t.discount.value/100 : Math.min(t.discount.value,base);
  let serv=0; if(t.service)  serv = t.service.type==='pct'  ? base*t.service.value/100  : t.service.value;
  const disc=ik+dsc, total=Math.max(0, sub-disc+serv);
  return {sub, ik, dsc, disc, serv, total, totalTL: total*rateOf(t.currency)};
}

/* --- ayrı (kalem bazlı) ödeme ---
   Bir masa, ürünler tek tek (herkes kendi payını) ödenerek kapatılabilir. Her ayrı
   ödeme normal bir satış kaydı (db.sales) olarak ANINDA yazılır; kayıtlar masanın
   splitId'siyle bağlanır ve kalemleri, masadaki satırın anahtarını (lk = lineKey)
   taşır. Bir satırın ödenen adedi bu kayıtlardan hesaplanır — masada ayrıca bir
   "ödendi" sayacı tutulmaz; böylece ödeme iptal edilip kayıt silinince sayaç ile
   para hiçbir zaman ayrışmaz. Ayrı ödeme yoksa (splitId yok) her şey eskisi gibi,
   tek satışla çalışır. */
function lineKey(i){ return i.lid||i.mid; }
function splitSales(t){ return t.splitId ? db.sales.filter(s=>s.splitId===t.splitId) : []; }
function splitPaidMap(t){
  const m={};
  splitSales(t).forEach(s=>(s.items||[]).forEach(i=>{ if(i.lk) m[i.lk]=(m[i.lk]||0)+i.qty; }));
  return m;
}
function lineLeft(i, pm){ return i.qty-Math.min(i.qty, pm[lineKey(i)]||0); }
/* ödenmemiş kalemler; sel verilirse (lineKey → adet) yalnızca seçilen adetler (kalanı geçemez).
   İkram edilen satırlar (ikram alanı dolu) seçilemez ve ücretsizdir: seçim olsa da olmasa da
   henüz kaydı alınmamış olanlar sıradaki ödemeye otomatik girer (ikram, satış kaydında,
   stok tüketiminde ve ikram raporunda görünsün diye); ödemeye bir tutar eklemezler. */
function splitRows(t, pm, sel){
  const rows=[];
  t.items.forEach(i=>{
    const k=lineKey(i), left=lineLeft(i,pm), q=(sel&&!i.ikram)?Math.min(sel[k]||0,left):left;
    if(q>0){
      const r={lk:k, name:i.name, cat:i.cat, qty:q, unit:i.unit, mid:i.mid, variant:i.variant};
      if(i.ikram) r.ikram={...i.ikram};
      rows.push(r);
    }
  });
  return rows;
}
/* masa düzeyindeki indirim/servis ücreti, ödenecek kısma (rows) dağıtılır.
   Yüzde: kısmın kendi tutarı üzerinden. Sabit tutar: (tutar − önceki ödemelere
   verilen) × kısmın ödenmemiş toplam içindeki payı; son kısım kalanı tam alır, yani
   parçaların toplamı masa tutarına eşit çıkar. Ayrı ödeme yokken ve her şey
   seçiliyken calcTotals ile birebir aynıdır. */
function partTotals(t, rows, pm){
  /* ikram satırları (r.ikram) ücretsizdir: dağıtılan indirim/servis yalnızca ödenecek
     kalemler üzerindendir (P, U); ikramın tutarı ik olarak ayrıca düşer */
  const pay=a=>a.reduce((x,r)=>x+(r.ikram?0:r.qty*r.unit),0), all=a=>a.reduce((x,r)=>x+r.qty*r.unit,0);
  const P=pay(rows), ik=all(rows)-P, U=pay(splitRows(t,pm)), sales=splitSales(t), last=P>=U-1e-9;
  const given=k=>sales.reduce((a,s)=>a+(s[k]||0)-(k==='disc'?(s.ikramAmt||0):0),0);
  const share=left=>last?left:Math.round(left*(U>0?P/U:0)*100)/100;
  let dsc=0, serv=0;
  if(t.discount) dsc = t.discount.type==='pct' ? P*t.discount.value/100 : Math.min(share(Math.max(0,t.discount.value-given('disc'))), P);
  if(t.service)  serv = t.service.type==='pct'  ? P*t.service.value/100  : share(Math.max(0,t.service.value-given('serv')));
  const total=Math.max(0, P-dsc+serv);
  return {sub:P+ik, ik, dsc, disc:ik+dsc, serv, total, totalTL: total*rateOf(t.currency)};
}
/* masada şu an ödenmesi gereken (ayrı ödemeler düşülmüş) tutarlar */
function billTotals(t){
  if(!t.splitId) return calcTotals(t);
  const pm=splitPaidMap(t);
  return partTotals(t, splitRows(t,pm), pm);
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
  const items=(s.items||[]).filter(i=>!i.ikram); /* ikram edilen kalemler ücretsiz: yemek tutarına girmez */
  const kLines=items.filter(i=>KITCHEN_CATS.includes(i.cat));
  if(!kLines.length) return 0;
  const rawSum=a=>a.reduce((x,i)=>x+i.qty*i.unit,0);
  let sub;
  if(s.discount && s.discount.type==='pct'){
    sub = rawSum(kLines) * (1 - s.discount.value/100);
  }else if(s.discount && s.discount.type==='amt' && items.length){
    const perLine = s.discount.value / items.length;
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
    guestK:0, guestE:0, guestC:0,
    count:0, tahN:0, tahK:0, sales:S
  };
  /* ayrı ödemeyle kapanan bir masa birden çok satış kaydıdır (aynı splitId) —
     masa ve misafir sayısı her çek için yalnızca bir kez sayılır */
  const seen=new Set();
  S.forEach(s=>{
    const k=s.splitId||s.id; if(seen.has(k)) return; seen.add(k);
    stats.count++;
    if(s.couvert){ stats.guestK+=s.couvert.k; stats.guestE+=s.couvert.e; stats.guestC+=s.couvert.c; }
  });
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

/* Ayrı ödemeyle alınan bir masa birden çok satış kaydıdır (aynı splitId) ama
   istatistikte TEK çektir. mergeSplitSales: bir çekin ödemelerini (zaman sırasıyla)
   tek çek nesnesinde birleştirir — kalemler (lk'ye göre) ve tutarlar toplanır,
   parts ödemelerin kendisidir. groupChecks: sırayla gelen satışlardan çek listesi
   çıkarır (ayrı ödemesiz satış olduğu gibi kalır; çek, son ödemesinin sırasında
   görünür). findCheck: satış ya da splitId'den çeki bulur. Veriye dokunmaz. */
function mergeSplitSales(parts){
  const first=parts[0], last=parts[parts.length-1];
  const lines=new Map();
  parts.forEach(p=>(p.items||[]).forEach(i=>{
    const k=i.lk||(i.name+'|'+i.unit), l=lines.get(k);
    if(l) l.qty+=i.qty; else lines.set(k,{...i});
  }));
  const sum=k=>parts.reduce((a,p)=>a+(p[k]||0),0), total=sum('total'), totalTL=sum('totalTL');
  return {...last, id:first.splitId, splitId:first.splitId, parts, items:[...lines.values()],
    openedAt:first.openedAt, checkNo:first.checkNo||last.checkNo,
    sub:sum('sub'), disc:sum('disc'), serv:sum('serv'), ikramAmt:sum('ikramAmt'), total, totalTL,
    rate:parts.every(p=>p.rate===first.rate) ? first.rate : (total>0 ? totalTL/total : last.rate),
    complimentary:parts.every(p=>p.complimentary) ? first.complimentary : null,
    cariName:[...new Set(parts.filter(p=>p.method==='cari').map(p=>p.cariName))].join(', ')||null};
}
function splitParts(key){ return db.sales.filter(x=>x.splitId===key).sort((a,b)=>a.closedAt-b.closedAt); }
function groupChecks(sales){
  const by=new Map();
  sales.forEach(s=>{ if(s.splitId){ if(!by.has(s.splitId)) by.set(s.splitId,[]); by.get(s.splitId).push(s); } });
  by.forEach(a=>a.sort((x,y)=>x.closedAt-y.closedAt));
  const out=[];
  sales.forEach(s=>{
    if(!s.splitId){ out.push(s); return; }
    const parts=by.get(s.splitId);
    if(parts[parts.length-1]===s) out.push(mergeSplitSales(parts));
  });
  return out;
}
function findCheck(id){
  const s=db.sales.find(x=>x.id===id), key=s?s.splitId:id;
  if(key){ const parts=splitParts(key); if(parts.length) return mergeSplitSales(parts); }
  return s||null;
}
/* çekin ödeme yöntemi: tek yöntemse o, karışıksa "Nakit (TL) + Kredi Kartı" */
function checkPayLabel(c){
  if(!c.parts) return payLabel(c);
  const u=[]; c.parts.forEach(p=>{ const l=payLabel(p); if(!u.includes(l)) u.push(l); });
  return u.join(' + ');
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
