'use strict';
/* ============================================================
   WALKY POS — cari hesaplar (veresiye defteri)
   ============================================================ */
function viewCari(){
  if(!db.cari.length) return `<div class="page-head"><div><h1>Cari Hesaplar</h1><div class="sub">Veresiye defteri</div></div></div>
    <div class="panel muted">Henüz cari hesap yok. Garson ödeme ekranında "Cari At" seçtiğinde burada hesap oluşur.</div>`;
  const rows=db.cari.map(c=>{
    const b=cariBalance(c);
    return `<tr><td><b>${esc(c.name)}</b></td>
      <td class="num">${fmt(b.borc)}</td><td class="num green">${fmt(b.tah)}</td>
      <td class="num ${b.bal>0?'red':'green'}">${fmt(b.bal)}</td>
      <td class="right">
        <button class="rowbtn" onclick="cariDetail('${c.id}')">Hareketler</button>&nbsp;
        <button class="btn sm green" onclick="openTahsilat('${c.id}')" ${b.bal>0?'':'disabled'}>Tahsilat Al</button>
      </td></tr>`;}).join('');
  return `<div class="page-head"><div><h1>Cari Hesaplar</h1><div class="sub">Veresiye defteri · Tahsilatlar kasaya işlenir</div></div></div>
    <table class="dt"><thead><tr><th>Hesap</th><th>Toplam Borç</th><th>Tahsilat</th><th>Bakiye</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}
function cariDetail(id){
  const c=db.cari.find(x=>x.id===id); if(!c) return;
  const rows=c.entries.slice().reverse().map(e=>
    `<div class="mini-row"><span class="muted small">${trDT(e.ts)}${e.note?' · '+esc(e.note):''}${e.method?' · '+(e.method==='nakit'?'Nakit':'Kart'):''}</span>
     <span class="v ${e.type==='borc'?'red':'green'}">${e.type==='borc'?'+':'−'}${fmt(e.amtTL)}</span></div>`).join('');
  const b=cariBalance(c);
  showModal(`<div class="m-head"><h3>${esc(c.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="mini-row"><span>Güncel Bakiye</span><span class="v ${b.bal>0?'red':'green'}">${fmt(b.bal)}</span></div>
    <div class="mt12">${rows||'<div class="muted small">Hareket yok.</div>'}</div>
    <div class="m-actions"><button class="btn accent" onclick="closeModal()">Kapat</button></div>`,true);
}
function openTahsilat(id){
  const c=db.cari.find(x=>x.id===id); const b=cariBalance(c);
  showModal(`<div class="m-head"><h3>Tahsilat — ${esc(c.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">Güncel bakiye: <b class="red">${fmt(b.bal)}</b></p>
    <label class="fl">Tahsilat Tutarı (₺)</label>
    <input id="thVal" class="inp" inputmode="decimal" value="${b.bal.toFixed(2)}">
    <label class="fl">Ödeme Şekli</label>
    <div class="seg" id="thSeg">
      <button class="seg-b on" data-t="nakit" onclick="segSel(this)">💵 Nakit</button>
      <button class="seg-b" data-t="kart" onclick="segSel(this)">💳 Kredi Kartı</button>
    </div>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn green" onclick="applyTahsilat('${id}')">Tahsilatı Kaydet</button></div>`);
}
function applyTahsilat(id){
  const c=db.cari.find(x=>x.id===id); const v=num($('#thVal').value);
  const b=cariBalance(c);
  if(v<=0){toast('Geçerli bir tutar girin','err');return}
  if(v>b.bal+0.001){toast('Tutar bakiyeden büyük olamaz','err');return}
  const method=document.querySelector('#thSeg .on').dataset.t;
  c.entries.push({d:db.day.open?db.day.date:iso(), ts:Date.now(), type:'tahsilat', amtTL:v, method});
  saveDB(); closeModal(); render(); toast('Tahsilat kaydedildi ✓','ok');
}
