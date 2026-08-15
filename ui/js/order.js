'use strict';
/* ============================================================
   WALKY POS — sipariş ekranı
   ============================================================ */
function orderHTML(){
  const t=getTable(activeTableId);
  const cats=menuCats().map(c=>`<button class="cat-b ${orderCat===c?'on':''}" onclick="orderCat='${c}';orderSearch='';render()">${c}</button>`).join('');
  return `<div class="ord">
    <div class="ord-head">
      <span class="tname">${esc(displayName(t))}
        <button class="icon-b" title="Masayı yeniden adlandır" onclick="openRename()">✏️</button></span>
      <span class="sep"></span>
      <span class="mi">👤 ${esc(t.openedBy||'')}</span>
      <span class="mi">⏱ ${elapsedMin(t.openedAt)} dk</span>
      <span class="badge cur">${SYM[t.currency]} ${CUR_LABEL[t.currency]}</span>
      ${t.currency!=='TL'?`<span class="mi muted tiny">Kur: 1${SYM[t.currency]} = ${fmt(rateOf(t.currency))}</span>`:''}
      <span style="flex:1"></span>
      <button class="btn red sm" onclick="cancelTableAsk()">Masayı İptal Et</button>
      <button class="icon-b" style="font-size:18px" title="Masa planına dön" onclick="view='tables';render()">✕</button>
    </div>
    <div class="ord-body">
      <div class="ord-cats">${cats}</div>
      <div class="ord-mid">
        <input class="inp" value="${esc(orderSearch)}" oninput="orderSearch=this.value;renderProdGrid()">
        <div class="prod-grid" id="prodGrid">${prodGridHTML()}</div>
      </div>
      <div class="ord-right" id="orderPanel">${orderPanelHTML()}</div>
    </div>
  </div>`;
}
function prodGridHTML(){
  const t=getTable(activeTableId);
  const q=orderSearch.trim().toLowerCase();
  const list=db.menu.filter(m=> q ? m.name.toLowerCase().includes(q) : m.cat===orderCat);
  if(!list.length) return `<div class="muted" style="grid-column:1/-1;padding:24px 4px">Ürün bulunamadı.</div>`;
  return list.map(m=>`<button class="prod" onclick="addItem('${m.id}')">
    <span class="prod-ic">🍽️</span>
    <span class="prod-nm">${esc(m.name)}</span>
    <span class="prod-pr">${fmt(m.price[t.currency],t.currency)}</span>
    ${t.currency!=='TL'?`<span class="prod-tl">${fmt(m.price[t.currency]*rateOf(t.currency))}</span>`:''}
  </button>`).join('');
}
function renderProdGrid(){const g=$('#prodGrid'); if(g) g.innerHTML=prodGridHTML()}
function renderOrderPanel(){const p=$('#orderPanel'); if(p) p.innerHTML=orderPanelHTML()}

function orderPanelHTML(){
  const t=getTable(activeTableId), c=t.currency, tot=calcTotals(t);
  const kCount=t.items.reduce((a,i)=>KITCHEN_CATS.includes(i.cat)?a+(i.qty-i.sent):a,0);
  const lines=t.items.length ? t.items.map(i=>`<div class="oline">
      <span class="n">${esc(i.name)}${c!=='TL'?`<span class="sub-tl">${fmt(i.unit*rateOf(c))} / adet</span>`:''}</span>
      <span class="qty"><button onclick="decItem('${i.mid}')">−</button><span class="q">${i.qty}</span><button onclick="addItem('${i.mid}')">+</button></span>
      <span class="p">${fmt(i.qty*i.unit,c)}${c!=='TL'?`<span class="sub-tl">${fmt(i.qty*i.unit*rateOf(c))}</span>`:''}</span>
      <button class="x" title="Kaldır" onclick="removeItem('${i.mid}')">✕</button>
    </div>`).join('')
    : `<div class="empty-o">Henüz ürün eklenmedi.<br>Soldaki menüden ürün seçin.</div>`;
  const dLabel=t.complimentary ? `🎁 İkram — ${esc(t.complimentary.name)}` : (t.discount ? (t.discount.type==='pct'?`İndirim (%${fmtQ(t.discount.value)})`:'İndirim') : null);
  const sLabel=t.service ? (t.service.type==='pct'?`Servis Ücreti (%${fmtQ(t.service.value)})`:'Servis Ücreti') : null;
  return `<div class="rt"><h3>Sipariş</h3><span class="badge gray">${t.items.reduce((a,i)=>a+i.qty,0)} kalem</span></div>
    <div class="olines">${lines}</div>
    <div class="ord-foot">
      <div class="trow"><span>Ara Toplam</span><b>${fmt(tot.sub,c)}</b></div>
      ${t.discount?`<div class="trow"><span>${dLabel}</span><b class="green">−${fmt(tot.disc,c)}</b></div>`:''}
      ${t.service?`<div class="trow"><span>${sLabel}</span><b class="amber">+${fmt(tot.serv,c)}</b></div>`:''}
      <div class="trow big"><span>Toplam</span><span class="v">${fmt(tot.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (POS)</span><b class="accent">${fmt(tot.totalTL)}</b></div>`:''}
      <div class="btn-grid">
        <button class="btn" onclick="openAdjModal('discount')">İndirim</button>
        <button class="btn" onclick="openAdjModal('service')">Servis Ücreti</button>
        <button class="btn" onclick="printKitchen()">Mutfak Fişi${kCount?` <span class="badge cur">${kCount}</span>`:''}</button>
        <button class="btn" onclick="printReceipt()">Hesap Yazdır</button>
        <button class="btn amber" style="grid-column:1/-1" onclick="openIkramModal()" ${t.items.length?'':'disabled'}>🎁 İkram</button>
        <button class="btn green" style="grid-column:1/-1" onclick="startPayment()" ${t.items.length?'':'disabled'}>Hesap Al</button>
      </div>
    </div>`;
}

/* --- sipariş kalemleri --- */
function addItem(mid){
  const t=getTable(activeTableId); const m=db.menu.find(x=>x.id===mid); if(!t||!m) return;
  const warn=applyRecipe(m,1);
  const line=t.items.find(i=>i.mid===mid);
  if(line) line.qty++;
  else t.items.push({mid, name:m.name, cat:m.cat, qty:1, unit:m.price[t.currency], sent:0});
  if(warn) toast(m.name+' için stok eksiye düştü!','err');
  saveDB(); renderOrderPanel();
}
function decItem(mid){
  const t=getTable(activeTableId); const line=t.items.find(i=>i.mid===mid); if(!line) return;
  const m=db.menu.find(x=>x.id===mid);
  if(m) applyRecipe(m,-1);
  line.qty--; if(line.sent>line.qty) line.sent=line.qty;
  if(line.qty<=0) t.items=t.items.filter(i=>i!==line);
  saveDB(); renderOrderPanel();
}
function removeItem(mid){
  const t=getTable(activeTableId); const line=t.items.find(i=>i.mid===mid); if(!line) return;
  const m=db.menu.find(x=>x.id===mid);
  if(m) applyRecipe(m,-line.qty);
  t.items=t.items.filter(i=>i!==line);
  saveDB(); renderOrderPanel();
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
  showModal(`<div class="m-head"><h3>🎁 İkram</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">Masadaki tüm tutara %100 indirim uygulanır. Kime ve hangi sebeple ikram edildiği; kim tarafından verildiği ve içerdiği ürünler muhasebe kayıtlarında görünür.</p>
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

/* --- masa iptali --- */
function cancelTableAsk(){
  const t=getTable(activeTableId);
  showModal(`<div class="m-head"><h3>Masayı İptal Et</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted">${esc(displayName(t))} satış kaydı oluşturulmadan kapatılacak ve girilen ürünler stoğa geri eklenecek. Emin misiniz?</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="cancelTable()">Evet, İptal Et</button></div>`);
}
function cancelTable(){
  const t=getTable(activeTableId);
  t.items.forEach(i=>{ const m=db.menu.find(x=>x.id===i.mid); if(m) applyRecipe(m,-i.qty); });
  resetTable(t); saveDB(); closeModal(); view='tables'; render(); toast('Masa iptal edildi, stok geri yüklendi','ok');
}
function resetTable(t){
  t.status='empty'; t.customName=null; t.currency=null; t.openedAt=null; t.openedBy=null;
  t.items=[]; t.discount=null; t.service=null; t.complimentary=null;
}

/* --- ödeme --- */
function startPayment(){
  payState={method:null, payCur:getTable(activeTableId).currency, cariName:'', print:false};
  openPaymentModal();
}
function openPaymentModal(){
  const t=getTable(activeTableId), c=t.currency, tot=calcTotals(t);
  if(!payState) payState={method:null, payCur:c, cariName:'', print:false};
  const items=t.items.map(i=>`<div class="sum-line"><span>${esc(i.name)} <span class="muted">x${i.qty}</span></span><b>${fmt(i.qty*i.unit,c)}</b></div>`).join('');
  const mSel=m=>payState.method===m?'on':'';
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
  showModal(`<div class="m-head"><h3>Hesap Al <span class="muted small" style="font-weight:500">&nbsp;${esc(displayName(t))}</span></h3>
    <button class="icon-b" onclick="payState=null;closeModal()">✕</button></div>
    ${items}
    <div class="mt12">
      <div class="trow"><span>Ara Toplam</span><b>${fmt(tot.sub,c)}</b></div>
      ${t.discount?`<div class="trow"><span>${t.complimentary?'🎁 İkram — '+esc(t.complimentary.name):'İndirim'+(t.discount.type==='pct'?' (%'+fmtQ(t.discount.value)+')':'')}</span><b class="green">−${fmt(tot.disc,c)}</b></div>`:''}
      ${t.service?`<div class="trow"><span>Servis Ücreti${t.service.type==='pct'?' (%'+fmtQ(t.service.value)+')':''}</span><b class="amber">+${fmt(tot.serv,c)}</b></div>`:''}
      <div class="trow big"><span>Toplam</span><span class="v">${fmt(tot.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (Kur: 1${SYM[c]} = ${fmt(rateOf(c))})</span><b class="accent">${fmt(tot.totalTL)}</b></div>`:''}
    </div>
    <label class="fl" style="letter-spacing:1px;font-size:11.5px;color:var(--muted)">ÖDEME YÖNTEMİ</label>
    <div class="pay-grid">
      <button class="pay-card ${mSel('nakit')}" onclick="payState.method='nakit';openPaymentModal()"><span class="pi">💵</span>Nakit</button>
      <button class="pay-card ${mSel('kart')}"  onclick="payState.method='kart';openPaymentModal()"><span class="pi">💳</span>Kredi Kartı</button>
      <button class="pay-card ${mSel('cari')}"  onclick="payState.method='cari';openPaymentModal()"><span class="pi">🧾</span>Cari At</button>
    </div>
    ${extra}
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" ${payState.print?'checked':''} onchange="payState.print=this.checked"> Ödeme sonrası fiş yazdır
    </label>
    <div class="m-actions">
      <button class="btn ghost" onclick="payState=null;closeModal()">Vazgeç</button>
      <button class="btn green" onclick="completePayment()" ${payState.method?'':'disabled'}>Ödemeyi Tamamla</button>
    </div>`);
}
function completePayment(){
  const t=getTable(activeTableId), tot=calcTotals(t);
  if(!payState||!payState.method) return;
  if(payState.method==='cari' && !(payState.cariName||'').trim()){toast('Cari için bir isim girin','err');return}
  const sale={
    id:uid(), bd:db.day.date, table:displayName(t), origTable:t.name, waiter:t.openedBy,
    currency:t.currency, rate:rateOf(t.currency), openedAt:t.openedAt, closedAt:Date.now(),
    items:t.items.map(i=>({name:i.name, qty:i.qty, unit:i.unit})),
    sub:tot.sub, disc:tot.disc, serv:tot.serv, total:tot.total, totalTL:tot.totalTL,
    method:payState.method, payCur:payState.method==='nakit'?payState.payCur:null,
    cariName:payState.method==='cari'?payState.cariName.trim():null,
    complimentary:t.complimentary?{name:t.complimentary.name, by:t.complimentary.by}:null
  };
  db.sales.push(sale);
  if(sale.method==='cari'){
    let acc=db.cari.find(x=>x.name.toLowerCase()===sale.cariName.toLowerCase());
    if(!acc){acc={id:uid(), name:sale.cariName, entries:[]}; db.cari.push(acc);}
    acc.entries.push({d:db.day.date, ts:Date.now(), type:'borc', amtTL:sale.totalTL, note:sale.table});
  }
  if(payState.print) printReceipt(sale);
  resetTable(t); payState=null; saveDB(); closeModal();
  view='tables'; render(); toast('Ödeme alındı, masa kapatıldı ✓','ok');
}
