'use strict';
/* ============================================================
   WALKY POS — masa planı
   ============================================================ */
function viewTables(){
  const all=db.tables, open=all.filter(t=>t.status==='open'), empty=all.length-open.length;
  const shown=all.filter(t=> tableFilter==='all' ? true : tableFilter==='open' ? t.status==='open' : t.status==='empty');
  const cards=shown.map(t=>{
    const tot=t.status==='open'?calcTotals(t):null;
    return `<button class="tcard ${t.status==='open'?'open':''}" onclick="openTableFlow('${t.id}')">
      <div class="top"><span class="nm">${esc(displayName(t))}</span>
        ${t.status==='open'?`<span class="badge cur">${CUR_LABEL[t.currency]}</span>`:`<span class="badge gray">BOŞ</span>`}</div>
      ${t.status==='open'?`<div class="meta">
          <span>⏱ ${elapsedMin(t.openedAt)} dk · ${t.items.reduce((a,i)=>a+i.qty,0)} ürün · ${esc(t.openedBy||'')}</span>
          <span class="tot">${fmt(tot.total,t.currency)}${t.currency!=='TL'?` <span class="muted tiny">(${fmt(tot.totalTL)})</span>`:''}</span>
        </div>`:''}
    </button>`;}).join('');
  return `<div class="page-head">
      <div><h1>Masa Planı</h1><div class="sub">Toplam ${all.length} masa · İş günü: ${trDate(db.day.date)}</div></div>
      <div class="head-tools">
        <span class="chip"><span class="dot" style="background:#8b93a7"></span>${empty} Boş</span>
        <span class="chip"><span class="dot" style="background:var(--accent)"></span>${open.length} Dolu</span>
        <button class="chip ${tableFilter==='all'?'on':''}" onclick="tableFilter='all';render()">Tümü <span class="cnt">${all.length}</span></button>
        <button class="chip ${tableFilter==='empty'?'on':''}" onclick="tableFilter='empty';render()">Boş <span class="cnt">${empty}</span></button>
        <button class="chip ${tableFilter==='open'?'on':''}" onclick="tableFilter='open';render()">Dolu <span class="cnt">${open.length}</span></button>
      </div>
    </div>
    <div class="tgrid">${cards}</div>`;
}

/* --- masa açma: önce para birimi --- */
function openTableFlow(id){
  const t=getTable(id);
  if(t.status==='open'){ activeTableId=id; orderCat=menuCats()[0]; orderSearch=''; view='order'; render(); return; }
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
  t.items=[]; t.discount=null; t.service=null;
  saveDB(); closeModal();
  activeTableId=id; orderCat=menuCats()[0]; orderSearch=''; view='order'; render();
}
