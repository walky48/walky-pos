'use strict';
  
function orderHTML(){
  const t=getTable(activeTableId);
  const cats=orderTopCats().map(c=>`<button class="cat-b ${orderCat===c?'on':''}" onclick="orderCat='${c}';orderSubCat=null;orderSearch='';render()">${esc(c)}</button>`).join('');
  return `<div class="ord">
    <div class="ord-head">
      <span class="tname">${esc(displayName(t))}
        <button class="icon-b" onclick="openRename()">Adı Değiştir</button>
        <button class="icon-b" onclick="openMoveTable()">Taşı</button></span>
      <span class="badge gray">Çek #${fmtCheckNo(t.checkNo)}</span>
      <span class="sep"></span>
      <span class="mi">${esc(t.openedBy||'')}</span>
      <span class="mi">${elapsedMin(t.openedAt)} dk</span>
      <span class="badge cur">${SYM[t.currency]} ${CUR_LABEL[t.currency]}</span>
      <span class="mi muted tiny">$=${fmt(db.rates.USD)} · €=${fmt(db.rates.EUR)}</span>
      <span class="mi muted tiny" style="cursor:pointer" onclick="openCouvertModal()" title="Kuver sayısını değiştir">Kuver ${t.couvert?(t.couvert.k+t.couvert.e+t.couvert.c):0}</span>
      <span style="flex:1"></span>
      <button class="btn sm" onclick="openFreeItemModal()">+ Serbest Ürün</button>
      <button class="btn red sm" onclick="cancelTableAsk()">Masayı İptal Et</button>
      <button class="icon-b" style="font-size:18px" title="Masa planına dön" onclick="view='tables';render()">✕</button>
    </div>
    <div class="ord-body">
      <div class="ord-cats">${cats}</div>
      <div class="ord-mid">
        <input class="inp" value="${esc(orderSearch)}" oninput="orderSearch=this.value;renderProdGrid();renderSubCatRow()">
        <div class="ord-subcats" id="ordSubcats">${subCatChipsHTML()}</div>
        <div class="prod-grid" id="prodGrid">${prodGridHTML()}</div>
      </div>
      <div class="ord-right" id="orderPanel">${orderPanelHTML()}</div>
    </div>
  </div>`;
}
/* Çorba..Tatlılar → "Yemekler", Gin..Kadeh Şaraplar → "Alkollü İçecekler" gibi
   gruplanmış üst kategori düğmeleri (bkz. backend/constants.js MENU_GROUPS).
   Ürünlerin gerçek .cat alanı değişmiyor — sadece sipariş ekranında toplanıyor. */
function orderTopCats(){
  const raw=menuCats(), out=[], seenGroup={};
  raw.forEach(c=>{
    const g=Object.keys(MENU_GROUPS).find(k=>MENU_GROUPS[k].includes(c));
    if(g){ if(!seenGroup[g]){ seenGroup[g]=true; out.push(g); } }
    else out.push(c);
  });
  return out;
}
function subCatChipsHTML(){
  const group=MENU_GROUPS[orderCat];
  if(!group || orderSearch.trim()) return '';
  const chips=[{c:null,label:'Tümü'}, ...group.map(c=>({c,label:c}))].map(x=>
    `<button class="subcat-b ${orderSubCat===x.c?'on':''}" onclick="orderSubCat=${x.c?`'${x.c}'`:'null'};renderProdGrid();renderSubCatRow()">${esc(x.label)}</button>`
  ).join('');
  return chips;
}
function renderSubCatRow(){const el=$('#ordSubcats'); if(el) el.innerHTML=subCatChipsHTML()}
function prodGridHTML(){
  const t=getTable(activeTableId);
  const q=orderSearch.trim().toLowerCase();
  let list;
  if(q){
    list=db.menu.filter(m=>m.name.toLowerCase().includes(q));
  }else{
    const group=MENU_GROUPS[orderCat];
    if(group){
      const cats=orderSubCat?[orderSubCat]:group;
      list=db.menu.filter(m=>cats.includes(m.cat)).slice().sort((a,b)=>a.name.localeCompare(b.name,'tr'));
    }else{
      list=db.menu.filter(m=>m.cat===orderCat);
    }
  }
  if(!list.length) return `<div class="muted" style="grid-column:1/-1;padding:24px 4px">Ürün bulunamadı.</div>`;
  return list.map(m=>`<button class="prod" onclick="addItem('${m.id}')">
    <span class="prod-nm">${esc(m.name)}${m.variants?' <b class="prod-opt" title="Seçenekli ürün">●</b>':''}</span>
    <span class="prod-pr">${fmt(m.price[t.currency],t.currency)}</span>
    ${t.currency!=='TL'?`<span class="prod-tl">${fmt(m.price[t.currency]*rateOf(t.currency))}</span>`:''}
  </button>`).join('');
}
function renderProdGrid(){const g=$('#prodGrid'); if(g) g.innerHTML=prodGridHTML()}
function renderOrderPanel(){const p=$('#orderPanel'); if(p) p.innerHTML=orderPanelHTML()}

function orderPanelHTML(){
  const t=getTable(activeTableId), c=t.currency;
  const pm=splitPaidMap(t), sel=splitSelNow(t,pm), sales=splitSales(t), split=sales.length>0;
  const tot=billTotals(t); /* ayrı ödeme varsa kalan; yoksa calcTotals ile aynı */
  const leftQty=splitRows(t,pm).reduce((a,r)=>a+r.qty,0);
  const lines=t.items.length ? t.items.map(i=>{
      const lk=lineKey(i), paid=Math.min(i.qty,pm[lk]||0), left=i.qty-paid, sq=sel[lk]||0;
      const sub=(paid>0||sq>0||i.ikram) ? `<div class="osub">
          ${i.ikram?`<span class="badge low">İkram — ${esc(i.ikram.name)}</span>`:(paid>0?`<span class="badge ok">${paid>=i.qty?'Ödendi':'Ödenen '+paid+'/'+i.qty}</span>`:'')}
          ${sq>0?`<span class="osel">Ödenecek <span class="qty"><button onclick="splitSub('${lk}')">−</button><span class="q">${sq}</span><button onclick="splitAdd('${lk}')" ${sq>=left?'disabled':''}>+</button></span></span>`:''}
        </div>`:'';
      /* hediye düğmesi: yalnızca bu ürünü ikram eder; ikramlıysa aynı düğme ikramı iptal ettirir */
      const gift=(!t.complimentary && (i.ikram || left>0))
        ? `<button class="gift-b ${i.ikram?'on':''}" title="${i.ikram?'İkramı iptal et':'Bu ürünü ikram et'}" onclick="openGiftModal('${lk}')">${GIFT_SVG}</button>` : '';
      return `<div class="oline ${paid>=i.qty?'paid':''} ${i.ikram?'ik':''}">
      ${gift}<span class="n">${esc(i.name)}${c!=='TL'?`<span class="sub-tl">${fmt(i.unit*rateOf(c))} / adet</span>`:''}</span>
      <span class="qty"><button onclick="decLine('${lk}')">−</button><span class="q">${i.qty}</span><button onclick="incLine('${lk}')">+</button></span>
      <span class="p">${fmt(i.qty*i.unit,c)}${c!=='TL'?`<span class="sub-tl">${fmt(i.qty*i.unit*rateOf(c))}</span>`:''}</span>
      ${left>0 && !t.complimentary && !i.ikram?`<button class="sp-b" title="Bu üründen 1 adedi ayrı öde" onclick="splitAdd('${lk}')">Öde</button>`:''}
      <button class="x" title="Kaldır" onclick="removeLine('${lk}')">✕</button>
      ${sub}
    </div>`;}).join('')
    : `<div class="empty-o">Henüz ürün eklenmedi.<br>Soldaki menüden ürün seçin.</div>`;
  const dLabel=t.complimentary ? `İkram — ${esc(t.complimentary.name)}` : (t.discount ? (t.discount.type==='pct'?`İndirim (%${fmtQ(t.discount.value)})`:'İndirim') : null);
  const sLabel=t.service ? (t.service.type==='pct'?`Servis Ücreti (%${fmtQ(t.service.value)})`:'Servis Ücreti') : null;
  /* ikramlı satırlar sıradaki ödemeye kendiliğinden girer (selRows'ta var) ama "ödenecek ürün" sayısına katılmaz */
  const selRows=splitRows(t,pm,sel), selQty=selRows.reduce((a,r)=>a+(r.ikram?0:r.qty),0);
  const selBar=selQty>0 ? `<div class="split-bar">
      <div class="trow"><span>Ayrı ödenecek: <b>${selQty}</b> ürün</span><b class="accent">${fmt(partTotals(t,selRows,pm).total,c)}</b></div>
      <div class="btn-grid"><button class="btn ghost" onclick="splitClear()">Seçimi Temizle</button><button class="btn green" onclick="startSplitPay()">Seçilenleri Öde</button></div>
    </div>`:'';
  const paidTotal=sales.reduce((a,x)=>a+x.total,0);
  return `<div class="rt"><h3>Sipariş</h3><span class="badge gray">${t.items.reduce((a,i)=>a+i.qty,0)} kalem</span></div>
    <div class="olines">${lines}${splitPaymentsHTML(t,sales)}</div>
    <div class="ord-foot">
      ${selBar}
      ${split?`<div class="trow"><span>Ödenen (${sales.length} ödeme)</span><b class="green">${fmt(paidTotal,c)}</b></div>`:''}
      <div class="trow"><span>Ara Toplam</span><b>${fmt(tot.sub,c)}</b></div>
      ${tot.ik>0?`<div class="trow"><span>İkram (ürün)</span><b class="green">−${fmt(tot.ik,c)}</b></div>`:''}
      ${t.discount?`<div class="trow"><span>${dLabel}</span><b class="green">−${fmt(tot.dsc,c)}</b></div>`:''}
      ${t.service?`<div class="trow"><span>${sLabel}</span><b class="amber">+${fmt(tot.serv,c)}</b></div>`:''}
      <div class="trow big"><span>${split?'Kalan':'Toplam'}</span><span class="v">${fmt(tot.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (POS)</span><b class="accent">${fmt(tot.totalTL)}</b></div>`:''}
      <div class="btn-grid">
        <button class="btn" onclick="openAdjModal('discount')">İndirim</button>
        <button class="btn" onclick="openAdjModal('service')">Servis Ücreti</button>
        <button class="btn" onclick="sendOrder()">Sipariş Gönder</button>
        <button class="btn" onclick="printReceipt()">${split && !leftQty?'Adisyon Yazdır':'Hesap Yazdır'}</button>
        <button class="btn amber" style="grid-column:1/-1" onclick="openIkramModal()" ${leftQty?'':'disabled'}>İkram</button>
        ${split && !leftQty
          ? `<button class="btn green" style="grid-column:1/-1" onclick="splitCloseTable()">Tüm Hesap Ödendi — Masayı Kapat</button>`
          : `<button class="btn green" style="grid-column:1/-1" onclick="startPayment()" ${t.items.length?'':'disabled'}>Hesap Al</button>`}
      </div>
    </div>`;
}

/* --- sipariş kalemleri --- */
function addItem(mid){
  const m=db.menu.find(x=>x.id===mid); if(!m) return;
  if(m.variants && m.variants.length){ openVariantPicker(mid); return; }
  addLine(mid, m.recipe, m.name, null);
}
function openVariantPicker(mid){
  const m=db.menu.find(x=>x.id===mid); if(!m) return;
  const cards=m.variants.map((v,idx)=>`<button class="cur-card" onclick="addItemVariant('${mid}',${idx})">
      ${esc(v.label)}</button>`).join('');
  showModal(`<div class="m-head"><h3>${esc(m.name)} <span class="muted small" style="font-weight:500">&nbsp;seçenek seçin</span></h3>
    <button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="cur-grid">${cards}</div>`,true);
}
function addItemVariant(mid, idx){
  const m=db.menu.find(x=>x.id===mid); const v=m&&m.variants[idx]; if(!m||!v) return;
  addLine(mid, [...m.recipe, ...v.extra], m.name+' — '+v.label, v.label);
  closeModal();
}
function addLine(mid, recipe, name, variant){
  const t=getTable(activeTableId); const m=db.menu.find(x=>x.id===mid); if(!t||!m) return;
  const warn=applyRecipe({recipe},1);
  const line=t.items.find(i=>i.mid===mid && (i.variant||null)===variant && !i.ikram); /* ikram edilen satıra eklenmez */
  if(line) line.qty++;
  else t.items.push({lid:uid(), mid, name, cat:m.cat, qty:1, unit:m.price[t.currency], sent:0, variant, recipe});
  if(warn) toast(m.name+' için stok eksiye düştü!','err');
  saveDB(true); renderOrderPanel();
}
function findLine(lid){ return getTable(activeTableId).items.find(i=>(i.lid||i.mid)===lid); }
function lineRecipe(line){ if(line.recipe) return line.recipe; const m=db.menu.find(x=>x.id===line.mid); return m?m.recipe:[]; }
function incLine(lid){
  const line=findLine(lid); if(!line) return;
  applyRecipe({recipe:lineRecipe(line)},1);
  line.qty++;
  saveDB(true); renderOrderPanel();
}
/* ödemesi alınmış (ayrı ödeme) adedin altına inilemez ve satır kaldırılamaz —
   alınan ödemeler değiştirilemez (bkz. ui/js/split.js) */
function paidOf(t,line){ return Math.min(line.qty, splitPaidMap(t)[lineKey(line)]||0); }
function decLine(lid){
  const t=getTable(activeTableId); const line=findLine(lid); if(!line) return;
  if(paidOf(t,line)>line.qty-1){toast('Ödemesi alınmış adetler azaltılamaz','err');return}
  applyRecipe({recipe:lineRecipe(line)},-1);
  line.qty--; if(line.sent>line.qty) line.sent=line.qty;
  if(line.qty<=0) t.items=t.items.filter(i=>i!==line);
  saveDB(true); renderOrderPanel();
}
function removeLine(lid){
  const t=getTable(activeTableId); const line=findLine(lid); if(!line) return;
  if(paidOf(t,line)>0){toast('Ödemesi alınmış ürün kaldırılamaz','err');return}
  applyRecipe({recipe:lineRecipe(line)},-line.qty);
  t.items=t.items.filter(i=>i!==line);
  saveDB(true); renderOrderPanel();
}

/* --- indirim / servis ücreti --- */
function openAdjModal(kind){
  const t=getTable(activeTableId); const cur=t[kind];
  const title=kind==='discount'?'İndirim':'Servis Ücreti';
  showModal(`<div class="m-head"><h3>${title}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="seg" id="adjSeg">
      <button class="seg-b ${(!cur||cur.type==='pct')?'on':''}" data-t="pct" onclick="segSel(this)">% Yüzde</button>
      <button class="seg-b ${(cur&&cur.type==='amt')?'on':''}" data-t="amt" onclick="segSel(this)">${SYM[t.currency]} Tutar</button>
    </div>
    <label class="fl">Değer</label>
    <input id="adjVal" class="inp" inputmode="decimal" value="${cur?cur.value:''}">
    <div class="m-actions">
      ${cur?`<button class="btn red" onclick="clearAdj('${kind}')">Kaldır</button>`:''}
      <button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="applyAdj('${kind}')">Uygula</button>
    </div>`);
  $('#adjVal').focus();
}
function applyAdj(kind){
  const t=getTable(activeTableId);
  const type=document.querySelector('#adjSeg .on').dataset.t;
  const v=num($('#adjVal').value);
  if(v<=0){toast('Geçerli bir değer girin','err');return}
  if(type==='pct'&&v>100){toast('Yüzde 100’den büyük olamaz','err');return}
  t[kind]={type,value:v};
  if(kind==='discount') t.complimentary=null;
  saveDB(); closeModal(); renderOrderPanel();
}
function clearAdj(kind){
  const t=getTable(activeTableId); t[kind]=null;
  if(kind==='discount') t.complimentary=null;
  saveDB(); closeModal(); renderOrderPanel();
}

/* --- ikram --- */
function openIkramModal(){
  const t=getTable(activeTableId);
  if(!t.items.length){toast('Masada ürün yok','err');return}
  showModal(`<div class="m-head"><h3>İkram</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">${t.splitId?'Masada kalan (ödenmemiş) tutara':'Masadaki tüm tutara'} %100 indirim uygulanır. Kime ve hangi sebeple ikram edildiği; kim tarafından verildiği ve içerdiği ürünler muhasebe kayıtlarında görünür.</p>
    <label class="fl">Kime / Hangi Sebeple</label>
    <input id="ikramVal" class="inp" value="${t.complimentary?esc(t.complimentary.name):''}">
    <div class="m-actions">
      ${t.complimentary?`<button class="btn red" onclick="clearIkram()">Kaldır</button>`:''}
      <button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="applyIkram()">İkram Olarak Uygula</button>
    </div>`);
  $('#ikramVal').focus();
}
function applyIkram(){
  const t=getTable(activeTableId);
  const name=$('#ikramVal').value.trim();
  if(!name){toast('Bir isim/sebep girin','err');return}
  t.discount={type:'pct',value:100};
  t.complimentary={name, by:user.name};
  saveDB(); closeModal(); renderOrderPanel(); toast('İkram uygulandı — '+name,'ok');
}
function clearIkram(){
  const t=getTable(activeTableId);
  t.discount=null; t.complimentary=null;
  saveDB(); closeModal(); renderOrderPanel();
}

/* --- ürün bazlı ikram: satırın solundaki hediye düğmesi ---
   Yalnızca o ürün (ya da birkaç adedi) ücretsiz olur; masanın geri kalanı normal ödenir.
   Birkaç adedi ikram edilirse satır ikiye bölünür (ikramlı ve ikramsız). İkramlı satırda
   aynı düğme ikramı iptal ettirir. Satış kaydı alınmış (ödemeye girmiş) ikram geri
   alınamaz — alınan ödemeler gibi değiştirilemez. Hesap/stok mantığı backend/logic.js
   (calcTotals, splitRows, partTotals): ikram edilen kalem sub'da kalır, ik olarak düşer. */
const GIFT_SVG='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';
let giftState=null; /* {lk, q, name} — açık ikram penceresi */
function openGiftModal(lk){
  const t=getTable(activeTableId); if(!t) return;
  if(t.complimentary){toast('Masa zaten tamamen ikram','err');return}
  const line=findLine(lk); if(!line) return;
  const left=line.qty-paidOf(t,line);
  if(line.ikram){ giftCancelModal(t,line); return; }
  if(left<=0){toast('Bu ürünün ödemesi alınmış','err');return}
  giftState={lk, q:1, name:''};
  renderGiftModal();
}
function renderGiftModal(){
  const t=getTable(activeTableId), g=giftState; if(!t||!g) return;
  const line=findLine(g.lk); if(!line){giftClose();return}
  const c=t.currency, left=line.qty-paidOf(t,line);
  g.q=Math.max(1,Math.min(g.q,left));
  showModal(`<div class="m-head"><h3>İkram <span class="muted small" style="font-weight:500">&nbsp;${esc(line.name)}</span></h3>
    <button class="icon-b" onclick="giftClose()">✕</button></div>
    <p class="muted small">Yalnızca bu ürün ikram edilir ve hesaptan düşer; masanın geri kalanı normal ödenir. Kime ve hangi sebeple ikram edildiği ve kim tarafından verildiği muhasebe kayıtlarında görünür.</p>
    <div class="sum-line"><span>${esc(line.name)} ${left>1
      ? `<span class="qty" style="display:inline-flex;margin-left:8px"><button onclick="giftStep(-1)" ${g.q<=1?'disabled':''}>−</button><span class="q">${g.q}</span><button onclick="giftStep(1)" ${g.q>=left?'disabled':''}>+</button></span><span class="muted tiny" style="margin-left:6px">/ ${left}</span>`
      : '<span class="muted">x1</span>'}</span><b>${fmt(g.q*line.unit,c)}</b></div>
    <label class="fl">Kime / Hangi Sebeple</label>
    <input id="giftNm" class="inp" value="${esc(g.name)}">
    <div class="m-actions">
      <button class="btn ghost" onclick="giftClose()">İptal Et</button>
      <button class="btn accent" onclick="giftApply()">İkram Yaz</button>
    </div>`);
  $('#giftNm').focus();
}
function giftStep(d){
  if(!giftState) return;
  const el=$('#giftNm'); if(el) giftState.name=el.value;
  giftState.q+=d; renderGiftModal();
}
function giftClose(){ giftState=null; closeModal(); }
function giftApply(){
  const t=getTable(activeTableId), g=giftState; if(!t||!g) return;
  const name=$('#giftNm').value.trim();
  if(!name){toast('Bir isim/sebep girin','err');return}
  ensureLids(t);
  const line=t.items.find(i=>lineKey(i)===g.lk)||findLine(g.lk); if(!line||line.ikram){giftClose();return}
  const left=line.qty-paidOf(t,line), q=Math.min(g.q,left);
  if(q<1){toast('Bu ürünün ödemesi alınmış','err');giftClose();return}
  const ik={name, by:user.name};
  if(q>=line.qty){ line.ikram=ik; }
  else{
    /* bir kısmı ikram: ikramlı yeni satır ayrılır, kalanı ikramsız kalır (stok değişmez) */
    line.qty-=q; if(line.sent>line.qty) line.sent=line.qty;
    const g2={...line, lid:uid(), qty:q, sent:q, ikram:ik};
    if(line.recipe) g2.recipe=line.recipe.map(r=>({...r}));
    t.items.splice(t.items.indexOf(line)+1,0,g2);
  }
  giftState=null; saveDB(); closeModal(); renderOrderPanel(); toast('İkram yazıldı — '+name,'ok');
}
/* ikramlı satırın düğmesi: ikramı iptal ettirir (kaydı alınmışsa yalnızca bilgi verir) */
function giftCancelModal(t,line){
  const c=t.currency, taken=paidOf(t,line)>0;
  showModal(`<div class="m-head"><h3>${taken?'İkram':'İkramı İptal Et'} <span class="muted small" style="font-weight:500">&nbsp;${esc(line.name)}</span></h3>
    <button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="sum-line"><span>${esc(line.name)} <span class="muted">x${line.qty}</span></span><b>${fmt(line.qty*line.unit,c)}</b></div>
    <p class="muted small mt12">İkram: <b>${esc(line.ikram.name)}</b> <span class="muted tiny">(veren: ${esc(line.ikram.by)})</span></p>
    <p class="muted small">${taken?'Bu ikram hesaba işlenmiş (ödeme kaydına yazılmış); alınan ödemeler gibi değiştirilemez.':'İkramı iptal ederseniz ürün tekrar normal fiyatıyla hesaba katılır.'}</p>
    <div class="m-actions">
      <button class="btn ghost" onclick="closeModal()">${taken?'Kapat':'Vazgeç'}</button>
      ${taken?'':`<button class="btn red" onclick="giftCancel('${lineKey(line)}')">İkramı İptal Et</button>`}
    </div>`);
}
function giftCancel(lk){
  const t=getTable(activeTableId); if(!t) return;
  const line=findLine(lk); if(!line||!line.ikram){closeModal();return}
  if(paidOf(t,line)>0){toast('Hesaba işlenmiş ikram geri alınamaz','err');closeModal();return}
  delete line.ikram;
  /* aynı üründen ikramsız bir satır varsa tekrar onunla birleşir */
  const sib=t.items.find(x=>x!==line && !x.ikram && x.mid===line.mid && (x.variant||null)===(line.variant||null) && x.name===line.name && x.unit===line.unit);
  if(sib){ sib.qty+=line.qty; sib.sent=(sib.sent||0)+(line.sent||0); t.items=t.items.filter(x=>x!==line); }
  saveDB(); closeModal(); renderOrderPanel(); toast('İkram iptal edildi','ok');
}

/* --- masayı geçici adlandırma --- */
function openRename(){
  const t=getTable(activeTableId);
  showModal(`<div class="m-head"><h3>Masayı Yeniden Adlandır</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">Geçici bir isimdir; hesap alındığında masa <b>${esc(t.name)}</b> adına geri döner.</p>
    <label class="fl">Masa Adı</label>
    <input id="rnVal" class="inp" value="${esc(t.customName||'')}">
    <div class="m-actions">
      ${t.customName?`<button class="btn red" onclick="applyRename(true)">Orijinale Dön</button>`:''}
      <button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="applyRename()">Kaydet</button>
    </div>`);
  $('#rnVal').focus();
}
function applyRename(clear){
  const t=getTable(activeTableId);
  t.customName = clear ? null : ($('#rnVal').value.trim() || null);
  saveDB(); closeModal(); render();
}

/* --- masayı başka bir (boş) masaya taşıma --- */
function openMoveTable(){
  const t=getTable(activeTableId);
  const empties=db.tables.filter(x=>x.status==='empty');
  if(!empties.length){toast('Taşınacak boş masa yok','err');return}
  const cards=empties.map(x=>`<button class="cur-card" onclick="moveTableTo('${x.id}')">${esc(x.name)}</button>`).join('');
  showModal(`<div class="m-head"><h3>Masayı Taşı <span class="muted small" style="font-weight:500">&nbsp;${esc(displayName(t))} → nereye?</span></h3>
    <button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="cur-grid">${cards}</div>`,true);
}
function moveTableTo(destId){
  const src=getTable(activeTableId), dst=getTable(destId);
  if(!src||!dst||dst.status!=='empty') return;
  dst.status='open'; dst.currency=src.currency; dst.openedAt=src.openedAt; dst.openedBy=src.openedBy;
  dst.customName=src.customName; dst.items=src.items; dst.discount=src.discount;
  dst.service=src.service; dst.complimentary=src.complimentary; dst.couvert=src.couvert; dst.checkNo=src.checkNo;
  dst.splitId=src.splitId; splitSel=null;
  resetTable(src);
  activeTableId=destId;
  saveDB(); closeModal(); render();
  toast('Masa '+dst.name+' konumuna taşındı','ok');
}

/* --- menüde olmayan, serbest fiyatlı ürün ekleme --- */
/* Kategori seçimi yerine sade Yemek/İçecek seçimi: "Yemek" seçilirse gün sonu
   raporundaki toplam yemek tutarına (bkz. backend/logic.js saleKitchenTotalTL
   → KITCHEN_CATS) dahil olsun diye KITCHEN_CATS içindeki bir kategoriye
   ("Ana Yemekler") yazılır; "İçecek" seçilirse KITCHEN_CATS'te olmayan bir
   kategoriye ('İçecek') yazılıp yemek toplamına hiç girmez. */
let fiIsFood = true;
function openFreeItemModal(){
  const t=getTable(activeTableId);
  fiIsFood = true;
  showModal(`<div class="m-head"><h3>Serbest Ürün Ekle</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">Menüde olmayan bir sipariş için isim ve fiyat girin.</p>
    <label class="fl">Ürün Adı</label>
    <input id="fiName" class="inp" autocomplete="off">
    <label class="fl">Tür</label>
    <div class="seg">
      <button type="button" class="seg-b on" id="fiTypeYemek" onclick="setFiType(true)">Yemek</button>
      <button type="button" class="seg-b" id="fiTypeIcecek" onclick="setFiType(false)">İçecek</button>
    </div>
    <label class="fl">Fiyat (${CUR_LABEL[t.currency]})</label>
    <input id="fiPrice" class="inp" inputmode="decimal">
    <div class="m-actions">
      <button class="btn ghost" onclick="closeModal()">İptal</button>
      <button class="btn accent" onclick="addFreeItem()">Ekle</button>
    </div>`);
  $('#fiName').focus();
}
function setFiType(isFood){
  fiIsFood=isFood;
  const y=$('#fiTypeYemek'), i=$('#fiTypeIcecek');
  if(y) y.classList.toggle('on', isFood);
  if(i) i.classList.toggle('on', !isFood);
}
function addFreeItem(){
  const t=getTable(activeTableId);
  const name=$('#fiName').value.trim();
  const price=num($('#fiPrice').value);
  const cat=fiIsFood?'Ana Yemekler':'İçecek';
  if(!name){toast('Ürün adı girin','err');return}
  if(price<=0){toast('Geçerli bir fiyat girin','err');return}
  t.items.push({lid:uid(), mid:null, name, cat, qty:1, unit:price, sent:0, variant:null, recipe:[]});
  saveDB(true); closeModal(); renderOrderPanel(); toast(name+' eklendi','ok');
}

/* --- masa iptali --- */
function cancelTableAsk(){
  const t=getTable(activeTableId);
  if(splitSales(t).length){toast('Bu masada ayrı ödeme alınmış — masa iptal edilemez','err');return}
  showModal(`<div class="m-head"><h3>Masayı İptal Et</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted">${esc(displayName(t))} satış kaydı oluşturulmadan kapatılacak ve girilen ürünler stoğa geri eklenecek. Emin misiniz?</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="cancelTable()">Evet, İptal Et</button></div>`);
}
function cancelTable(){
  const t=getTable(activeTableId);
  t.items.forEach(i=>applyRecipe({recipe:lineRecipe(i)},-i.qty));
  resetTable(t); saveDB(); closeModal(); view='tables'; render(); toast('Masa iptal edildi, stok geri yüklendi','ok');
}
function resetTable(t){
  t.status='empty'; t.customName=null; t.currency=null; t.openedAt=null; t.openedBy=null;
  t.items=[]; t.discount=null; t.service=null; t.complimentary=null; t.couvert=null; t.checkNo=null; t.splitId=null;
}

/* --- ödeme --- */
function startPayment(){
  payState={method:null, payCur:getTable(activeTableId).currency, cariName:'', print:false, sel:null};
  openPaymentModal();
}
/* ödenecek kalemler ve tutarlar: sel yoksa masada kalan her şey (ayrı ödeme yoksa
   eskisi gibi bütün masa), sel varsa seçilen adetler. final: bu ödeme masada
   ödenmemiş hiçbir şey bırakmıyor. split: kayıt ayrı ödeme olarak (splitId, kalem
   anahtarları ile) yazılır — ürün seçilerek ya da ayrı ödemesi olan masada yapılan
   her ödeme. Masa YALNIZCA ayrı ödemesiz, tek seferlik "Hesap Al"da (final && !split)
   kendiliğinden kapanır; ayrı ödemeli masa her şey ödenince de açık kalır, adisyon
   basılıp elle kapatılır (bkz. ui/js/split.js splitCloseTable). */
function payTarget(t){
  const pm=splitPaidMap(t), sel=payState&&payState.sel;
  const rows=splitRows(t,pm,sel||null);
  const left=splitRows(t,pm).reduce((a,r)=>a+r.qty,0), q=rows.reduce((a,r)=>a+r.qty,0);
  const final=q>=left, split=!!t.splitId || !final || !!sel;
  const tot=split ? partTotals(t,rows,pm) : calcTotals(t);
  const lefts={}; splitRows(t,pm).forEach(r=>{ lefts[r.lk]=r.qty; });
  return {rows, tot, final, split, lefts};
}
function openPaymentModal(){
  const t=getTable(activeTableId), c=t.currency;
  if(!payState) payState={method:null, payCur:c, cariName:'', print:false, sel:null};
  const tg=payTarget(t), tot=tg.tot;
  /* ayrı ödeme akışında (Seçilenleri Öde) her ürünün yanında −/+ var: ödeme
     tamamlanmadan ödenecek adet azaltılıp artırılabilir (bkz. ui/js/split.js payStep) */
  const items=tg.rows.map(i=>`<div class="sum-line"><span>${esc(i.name)} ${payState.sel && !i.ikram
      ? `<span class="qty" style="display:inline-flex;margin-left:8px"><button onclick="payStep('${i.lk}',-1)">−</button><span class="q">${i.qty}</span><button onclick="payStep('${i.lk}',1)" ${i.qty>=tg.lefts[i.lk]?'disabled':''}>+</button></span>`
      : `<span class="muted">x${i.qty}</span>`}${i.ikram?` <span class="badge low">İkram — ${esc(i.ikram.name)}</span>`:''}</span><b>${fmt(i.qty*i.unit,c)}</b></div>`).join('');
  const mSel=m=>payState.method===m?'on':'';
  const showDisc=tg.split?tot.dsc>0:!!t.discount, showServ=tg.split?tot.serv>0:!!t.service;
  const after=tg.final?0:Math.max(0, billTotals(t).total-tot.total);
  let extra='';
  if(payState.method==='nakit' && c!=='TL'){
    extra=`<label class="fl">Müşteri hangi para birimiyle ödedi?</label>
      <div class="seg">
        <button class="seg-b ${payState.payCur===c?'on':''}" onclick="payState.payCur='${c}';openPaymentModal()">${SYM[c]} ${CUR_LABEL[c]}</button>
        <button class="seg-b ${payState.payCur==='TL'?'on':''}" onclick="payState.payCur='TL';openPaymentModal()">₺ TL (${fmt(tot.totalTL)})</button>
      </div>`;
  }
  if(payState.method==='cari'){
    const dl=db.cari.map(x=>`<option value="${esc(x.name)}">`).join('');
    extra=`<label class="fl">Cari Hesap Adı</label>
      <input id="cariNm" class="inp" list="cariList" value="${esc(payState.cariName)}" oninput="payState.cariName=this.value">
      <datalist id="cariList">${dl}</datalist>
      <p class="muted tiny mt8">Tutar bu isme veresiye olarak yazılır; tahsilatı Cari Hesaplar ekranından alınır.</p>`;
  }
  showModal(`<div class="m-head"><h3>${tg.final?'Hesap Al':'Ayrı Ödeme'} <span class="muted small" style="font-weight:500">&nbsp;${esc(displayName(t))}</span></h3>
    <button class="icon-b" onclick="payCancel()">✕</button></div>
    ${items}
    <div class="mt12">
      <div class="trow"><span>Ara Toplam</span><b>${fmt(tot.sub,c)}</b></div>
      ${tot.ik>0?`<div class="trow"><span>İkram (ürün)</span><b class="green">−${fmt(tot.ik,c)}</b></div>`:''}
      ${showDisc?`<div class="trow"><span>${t.complimentary?'İkram — '+esc(t.complimentary.name):'İndirim'+(t.discount.type==='pct'?' (%'+fmtQ(t.discount.value)+')':'')}</span><b class="green">−${fmt(tot.dsc,c)}</b></div>`:''}
      ${showServ?`<div class="trow"><span>Servis Ücreti${t.service.type==='pct'?' (%'+fmtQ(t.service.value)+')':''}</span><b class="amber">+${fmt(tot.serv,c)}</b></div>`:''}
      <div class="trow big"><span>Toplam</span><span class="v">${fmt(tot.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (Kur: 1${SYM[c]} = ${fmt(rateOf(c))})</span><b class="accent">${fmt(tot.totalTL)}</b></div>`:''}
      ${tg.final?'':`<div class="trow"><span>Bu ödemeden sonra masada kalan</span><b>${fmt(after,c)}</b></div>`}
      ${tg.final && tg.split?`<p class="muted tiny mt8">Bu ödemeden sonra hesabın tamamı ödenmiş olur; masa kendiliğinden kapanmaz, adisyonu yazdırıp masayı elle kapatırsınız.</p>`:''}
    </div>
    <label class="fl" style="letter-spacing:1px;font-size:11.5px;color:var(--muted)">ÖDEME YÖNTEMİ</label>
    <div class="pay-grid">
      <button class="pay-card ${mSel('nakit')}" onclick="payState.method='nakit';openPaymentModal()">Nakit</button>
      <button class="pay-card ${mSel('kart')}"  onclick="payState.method='kart';openPaymentModal()">Kredi Kartı</button>
      <button class="pay-card ${mSel('cari')}"  onclick="payState.method='cari';openPaymentModal()">Cari At</button>
    </div>
    ${extra}
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" ${payState.print?'checked':''} onchange="payState.print=this.checked"> Ödeme sonrası fiş yazdır
    </label>
    <div class="m-actions">
      <button class="btn ghost" onclick="payCancel()">Vazgeç</button>
      <button class="btn green" onclick="completePayment()" ${payState.method?'':'disabled'}>Ödemeyi Tamamla</button>
    </div>`);
}
function completePayment(){
  const t=getTable(activeTableId), tg=payTarget(t), tot=tg.tot;
  if(!payState||!payState.method) return;
  if(payState.method==='cari' && !(payState.cariName||'').trim()){toast('Cari için bir isim girin','err');return}
  if(!tg.rows.length){toast('Ödenecek ürün kalmadı','err');return}
  const sale={
    id:uid(), bd:db.day.date, checkNo:t.checkNo, table:displayName(t), origTable:t.name, waiter:t.openedBy,
    currency:t.currency, rate:rateOf(t.currency), openedAt:t.openedAt, closedAt:Date.now(),
    /* mid/variant, Genel Stok tüketim raporunun (bkz. backend/logic.js
       resolveSaleItemRecipe) satış anındaki reçeteyi doğru çözebilmesi için
       tutulur — isimden tahmin etmek yerine doğrudan menü kalemine bağlanır. */
    items:tg.rows.map(r=>{ const o={name:r.name, cat:r.cat, qty:r.qty, unit:r.unit, mid:r.mid, variant:r.variant}; if(tg.split) o.lk=r.lk; if(r.ikram) o.ikram={...r.ikram}; return o; }),
    sub:tot.sub, disc:tot.disc, serv:tot.serv, total:tot.total, totalTL:tot.totalTL,
    discount:t.discount?(tg.split && t.discount.type==='amt' ? {type:'amt', value:tot.dsc} : {...t.discount}):null,
    service:tg.split && t.service?(t.service.type==='amt' ? {type:'amt', value:tot.serv} : {...t.service}):null,
    method:payState.method, payCur:payState.method==='nakit'?payState.payCur:null,
    cariName:payState.method==='cari'?payState.cariName.trim():null,
    complimentary:t.complimentary?{name:t.complimentary.name, by:t.complimentary.by}:null,
    couvert:t.couvert?{...t.couvert}:null
  };
  /* ayrı ödeme: kayıt masanın splitId'sine bağlanır (bkz. backend/logic.js splitPaidMap) */
  if(tot.ik>0) sale.ikramAmt=tot.ik; /* ürün bazlı ikramların tutarı (disc'in içinde) */
  if(tg.split){ if(!t.splitId) t.splitId=uid(); sale.splitId=t.splitId; sale.paidBy=user.name; }
  db.sales.push(sale);
  if(sale.method==='cari'){
    let acc=db.cari.find(x=>x.name.toLowerCase()===sale.cariName.toLowerCase());
    if(!acc){acc={id:uid(), name:sale.cariName, entries:[]}; db.cari.push(acc);}
    acc.entries.push({d:db.day.date, ts:Date.now(), type:'borc', amtTL:sale.totalTL, note:sale.table, saleId:sale.id});
  }
  if(payState.print) printReceipt(sale);
  splitSel=null;
  if(tg.final && !tg.split){
    resetTable(t); payState=null; saveDB(); closeModal();
    view='tables'; render(); toast('Ödeme alındı, masa kapatıldı','ok');
  }else{
    /* ayrı ödemeli masa kendiliğinden kapanmaz: hepsi ödenmiş olsa da açık kalır */
    const rem=billTotals(t);
    payState=null; saveDB(); closeModal();
    render(); toast(tg.final ? 'Tüm hesap ödendi — adisyonu yazdırıp masayı kapatabilirsiniz' : 'Ayrı ödeme alındı — kalan '+fmt(rem.total,t.currency),'ok');
  }
}
