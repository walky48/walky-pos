'use strict';

function viewTables(){
  const all=db.tables, open=all.filter(t=>t.status==='open'), empty=all.length-open.length;
  const shown=all.filter(t=> tableFilter==='all' ? true : tableFilter==='open' ? t.status==='open' : t.status==='empty');
  const cards=shown.map(t=>{
    const tot=t.status==='open'?calcTotals(t):null;
    return `<button class="tcard ${t.status==='open'?'open':''}" ${remoteViewOnly()?'disabled':`onclick="openTableFlow('${t.id}')"`}>
      <div class="top"><span class="nm">${esc(displayName(t))}${t.status==='open'?` <span class="muted tiny">#${fmtCheckNo(t.checkNo)}</span>`:''}</span>
        ${t.status==='open'?`<span class="badge cur">${CUR_LABEL[t.currency]}</span>`:`<span class="badge gray">BOŞ</span>`}</div>
      ${t.status==='open'?`<div class="meta">
          <span>⏱ ${elapsedMin(t.openedAt)} dk · ${t.items.reduce((a,i)=>a+i.qty,0)} ürün · ${esc(t.openedBy||'')}</span>
          <span class="tot">${fmt(tot.total,t.currency)}${t.currency!=='TL'?` <span class="muted tiny">(${fmt(tot.totalTL)})</span>`:''}</span>
        </div>`:''}
    </button>`;}).join('');
  return `<div class="page-head">
      <div><h1>Masa Planı</h1><div class="sub">Toplam ${all.length} masa · İş günü: ${trDate(db.day.date)}</div></div>
      <div class="head-tools">
        <span class="chip rate-chip">$ = ${fmt(db.rates.USD)}</span>
        <span class="chip rate-chip">€ = ${fmt(db.rates.EUR)}</span>
        <span class="chip"><span class="dot" style="background:#8b93a7"></span>${empty} Boş</span>
        <span class="chip"><span class="dot" style="background:var(--accent)"></span>${open.length} Dolu</span>
        <button class="chip ${tableFilter==='all'?'on':''}" onclick="tableFilter='all';render()">Tümü <span class="cnt">${all.length}</span></button>
        <button class="chip ${tableFilter==='empty'?'on':''}" onclick="tableFilter='empty';render()">Boş <span class="cnt">${empty}</span></button>
        <button class="chip ${tableFilter==='open'?'on':''}" onclick="tableFilter='open';render()">Dolu <span class="cnt">${open.length}</span></button>
        ${!remoteViewOnly()?`<button class="btn accent sm" onclick="openNewTableModal()">+ Yeni Masa</button>`:''}
      </div>
    </div>
    <div class="tgrid">${cards}</div>`;
}

/* --- yeni masa oluşturma (ör. ek/geçici masa) --- */
function openNewTableModal(){
  if(remoteViewOnly()) return;
  showModal(`<div class="m-head"><h3>Yeni Masa</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Masa Adı</label>
    <input id="ntName" class="inp" autocomplete="off">
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="createNewTable()">Oluştur</button></div>`);
  $('#ntName').focus();
}
function createNewTable(){
  const name=$('#ntName').value.trim();
  if(!name){toast('Masa adı girin','err');return}
  if(db.tables.some(t=>t.name.toLowerCase()===name.toLowerCase())){toast('Bu isimde bir masa zaten var','err');return}
  db.tables.push({id:uid(), name, customName:null, status:'empty',
    currency:null, openedAt:null, openedBy:null, items:[], discount:null, service:null, complimentary:null, couvert:null, checkNo:null});
  saveDB(); closeModal(); render(); toast(name+' masası oluşturuldu ✓','ok');
}

/* --- masa açma: önce para birimi --- */
function openTableFlow(id){
  if(remoteViewOnly()) return; /* restoran uzaktan sipariş girişini açmadıysa patron salt-okunur kalır */
  const t=getTable(id);
  if(t.status==='open'){ activeTableId=id; orderCat=orderTopCats()[0]; orderSubCat=null; orderSearch=''; view='order'; render(); return; }
  showModal(`<div class="m-head"><h3>Para Birimi Seçin <span class="muted small" style="font-weight:500">&nbsp;${esc(t.name)}</span></h3>
    <button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="cur-grid">
      <button class="cur-card" onclick="openWith('${id}','TL')"><span class="cur-sym">₺</span>TL</button>
      <button class="cur-card" onclick="openWith('${id}','USD')"><span class="cur-sym">$</span>DOLAR<span class="muted tiny" style="font-weight:500">1$ = ${fmt(db.rates.USD)}</span></button>
      <button class="cur-card" onclick="openWith('${id}','EUR')"><span class="cur-sym">€</span>EURO<span class="muted tiny" style="font-weight:500">1€ = ${fmt(db.rates.EUR)}</span></button>
    </div>`,true);
}
function openWith(id,cur){
  const t=getTable(id);
  t.status='open'; t.currency=cur; t.openedAt=Date.now(); t.openedBy=user.name;
  t.items=[]; t.discount=null; t.service=null; t.couvert=null;
  assignCheckNo(t);
  saveDB(); closeModal();
  activeTableId=id; orderCat=orderTopCats()[0]; orderSubCat=null; orderSearch=''; view='order';
  render();
  openCouvertModal();
}

/* --- masanın ilk açılışında kuver (kadın/erkek/çocuk) sayısı — sipariş
   ekranı arkada açık dururken modal önde gösterilir --- */
let cvTmp={k:0,e:0,c:0};
function openCouvertModal(){
  const t=getTable(activeTableId);
  cvTmp = t.couvert ? {...t.couvert} : {k:0,e:0,c:0};
  showModal(couvertModalHTML(t));
}
function couvertModalHTML(t){
  const row=(lbl,f)=>`<div style="flex:1;text-align:center">
      <label class="fl" style="text-align:center">${lbl}</label>
      <span class="qty" style="justify-content:center">
        <button onclick="cvStep('${f}',-1)">−</button>
        <span class="q" id="cv${f}">${cvTmp[f]}</span>
        <button onclick="cvStep('${f}',1)">+</button>
      </span>
    </div>`;
  return `<div class="m-head"><h3>Kuver Sayısı <span class="muted small" style="font-weight:500">&nbsp;${esc(t.name)}</span></h3></div>
    <div style="display:flex;gap:10px;margin-top:6px">
      ${row('Kadın','k')}${row('Erkek','e')}${row('Çocuk','c')}
    </div>
    <div class="m-actions"><button class="btn accent wide" onclick="applyCouvert()">${t.couvert?'Kaydet':'Devam Et'}</button></div>`;
}
function cvStep(f,d){
  cvTmp[f]=Math.max(0, cvTmp[f]+d);
  const el=$('#cv'+f); if(el) el.textContent=cvTmp[f];
}
function applyCouvert(){
  const t=getTable(activeTableId);
  const {k,e,c}=cvTmp;
  if(k+e+c<=0){toast('En az 1 kişi girin','err');return}
  t.couvert={k,e,c};
  saveDB(); closeModal(); render();
}
