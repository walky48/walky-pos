'use strict';

function groupExpenses(list){
  const g={};
  list.forEach(e=>{
    const k=e.name+'|'+e.unit;
    if(!g[k]) g[k]={name:e.name, unit:e.unit, total:0};
    g[k].total+=e.qty;
  });
  return Object.values(g).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
}
function expenseGroupRows(list){
  const g=groupExpenses(list);
  if(!g.length) return '<div class="muted small">Bu aralıkta gider kaydı yok.</div>';
  return g.map(x=>`<div class="mini-row"><span>${esc(x.name)}</span><span class="v">${fmtQ(x.total)} ${esc(x.unit)}</span></div>`).join('');
}
function viewGiderler(){
  const inRange=(e,f,t)=>{const d=iso(new Date(e.ts)); return d>=f && d<=t;};
  const listF=gidCustom?gidFrom:weekStartISO(), listT=gidCustom?gidTo:iso();
  const weekList=db.expenses.filter(e=>inRange(e,weekStartISO(),iso()));
  const monthList=db.expenses.filter(e=>inRange(e,monthStartISO(),iso()));
  const rangeList=db.expenses.filter(e=>inRange(e,listF,listT));
  const logRows=rangeList.slice().reverse().map(e=>`<tr>
      <td data-lbl="Tarih/Saat">${trDT(e.ts)}</td>
      <td data-lbl="Ürün"><b>${esc(e.name)}</b></td>
      <td class="num" data-lbl="Miktar">${fmtQ(e.qty)} ${esc(e.unit)}</td>
      <td class="muted" data-lbl="Giren">${esc(e.by)}</td>
    </tr>`).join('');
  return `<div class="page-head">
      <div><h1>Giderler</h1><div class="sub">Menüde olmayan günlük gider/malzeme kullanımı</div></div>
      <button class="btn accent" onclick="openExpenseModal()">+ Yeni Gider</button></div>
    <div class="two-col">
      <div class="panel"><div class="st" style="margin-bottom:10px">BU HAFTA</div>${expenseGroupRows(weekList)}</div>
      <div class="panel"><div class="st" style="margin-bottom:10px">BU AY</div>${expenseGroupRows(monthList)}</div>
    </div>
    <div class="panel mt16"><div class="st" style="margin-bottom:12px">ÖZEL TARİH ARALIĞI</div>
      <div class="range-bar">
        <div class="fld"><span>Başlangıç</span><input type="date" id="gdF" class="inp dte" value="${listF}"></div>
        <div class="fld"><span>Bitiş</span><input type="date" id="gdT" class="inp dte" value="${listT}"></div>
        <button class="btn accent" onclick="applyGidRange()">Göster</button>
        ${gidCustom?`<button class="btn ghost" onclick="gidCustom=false;render()">Bu Haftaya Dön</button>`:''}
      </div>
    </div>
    <div class="two-col mt16">
      <div class="panel"><div class="st" style="margin-bottom:10px">TOPLAM (${trDate(listF)}${listF!==listT?' – '+trDate(listT):''})</div>${expenseGroupRows(rangeList)}</div>
      <div class="panel">
        <div class="st" style="margin-bottom:10px">KAYITLAR</div>
        ${logRows?`<table class="dt"><thead><tr><th>Tarih/Saat</th><th>Ürün</th><th class="right">Miktar</th><th>Giren</th></tr></thead><tbody>${logRows}</tbody></table>`
              :'<div class="muted small">Bu aralıkta gider kaydı yok.</div>'}
      </div>
    </div>`;
}
function applyGidRange(){
  gidFrom=$('#gdF').value||iso(); gidTo=$('#gdT').value||iso();
  if(gidFrom>gidTo){const x=gidFrom;gidFrom=gidTo;gidTo=x;}
  gidCustom=true; render();
}
function openExpenseModal(){
  showModal(`<div class="m-head"><h3>Yeni Gider</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Ürün Adı</label>
    <input id="exName" class="inp" autocomplete="off">
    <label class="fl">Miktar</label>
    <input id="exQty" class="inp" inputmode="decimal">
    <label class="fl">Birim</label>
    <div class="seg" id="exSeg">
      <button class="seg-b on" data-t="Kilo" onclick="segSel(this)">Kilo</button>
      <button class="seg-b" data-t="Adet" onclick="segSel(this)">Adet</button>
      <button class="seg-b" data-t="cl" onclick="segSel(this)">cl</button>
    </div>
    <div class="m-actions">
      <button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="addExpense()">Ekle</button>
    </div>`);
  $('#exName').focus();
}
function addExpense(){
  const name=$('#exName').value.trim();
  const qty=num($('#exQty').value);
  const unit=document.querySelector('#exSeg .on').dataset.t;
  if(!name){toast('Ürün adı girin','err');return}
  if(qty<=0){toast('Geçerli bir miktar girin','err');return}
  db.expenses.push({id:uid(), name, qty, unit, by:user.name, ts:Date.now()});
  saveDB(); closeModal(); render(); toast(name+' eklendi ✓','ok');
}
