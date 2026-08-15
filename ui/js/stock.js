'use strict';
/* ============================================================
   WALKY POS — stok ekranı (depo: sadece artırır · admin: tam yetki)
   ============================================================ */
function viewStock(){
  const canEdit = user.role==='admin';
  const counts={ok:0,low:0,crit:0};
  db.stock.forEach(s=>counts[stockStatus(s)]++);
  const cats=[...new Set(db.stock.map(s=>s.cat))];
  const sections=cats.map(cat=>{
    const rows=db.stock.filter(s=>s.cat===cat && (stockFilter==='all'||stockStatus(s)===stockFilter))
      .map(s=>`<tr>
        <td>${esc(s.name)}</td>
        <td class="num right" data-lbl="Stok">${fmtQ(s.qty)}</td>
        <td class="muted" data-lbl="Birim">${esc(s.unit)}</td>
        <td data-lbl="Durum"><span class="badge ${stockStatus(s)}">${ST_LBL[stockStatus(s)]}</span></td>
        <td class="right tdact">
          <button class="btn sm" onclick="openStockAdd('${s.id}')">+ Sayım</button>
          ${canEdit?`<button class="btn sm ghost" onclick="openStockEdit('${s.id}')">Düzenle</button>`:''}
        </td></tr>`).join('');
    if(!rows) return '';
    return `<div class="sect"><div class="st">${esc(cat)}</div>
      <table class="dt"><thead><tr><th>Ürün</th><th class="right">Stok</th><th>Birim</th><th>Durum</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }).join('');
  const log=db.stockLog.slice(-12).reverse().map(l=>
    `<div class="mini-row"><span class="muted small">${trDT(l.ts)} · ${esc(l.u)} · ${esc(l.reason)}</span>
     <span>${esc(l.name)} <b class="${l.delta>=0?'green':'red'}">${l.delta>=0?'+':''}${fmtQ(l.delta)}</b></span></div>`).join('');
  return `<div class="page-head">
      <div><h1>Stok Durumu</h1><div class="sub">Anlık stok görünümü · Satışta otomatik düşer${user.role==='depo'?' · Depo yalnızca sayım ile artırabilir':''}</div></div>
      <div class="head-tools">
        <button class="chip ${stockFilter==='all'?'on':''}" onclick="stockFilter='all';render()">Tümü</button>
        <button class="chip ${stockFilter==='ok'?'on':''}" onclick="stockFilter='ok';render()"><span class="dot" style="background:var(--green)"></span>Normal <span class="cnt">${counts.ok}</span></button>
        <button class="chip ${stockFilter==='low'?'on':''}" onclick="stockFilter='low';render()"><span class="dot" style="background:var(--amber)"></span>Azalıyor <span class="cnt">${counts.low}</span></button>
        <button class="chip ${stockFilter==='crit'?'on':''}" onclick="stockFilter='crit';render()"><span class="dot" style="background:var(--red)"></span>Kritik <span class="cnt">${counts.crit}</span></button>
      </div></div>
    ${sections}
    ${log?`<div class="sect"><div class="st">Son Stok Hareketleri</div>${log}</div>`:''}`;
}
function openStockAdd(sid){
  const s=db.stock.find(x=>x.id===sid);
  showModal(`<div class="m-head"><h3>Sayım Girişi — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">Mevcut stok: <b>${fmtQ(s.qty)} ${esc(s.unit)}</b>. Sayım sonucu eklenecek miktarı girin (yalnızca artırma yapılabilir).</p>
    <label class="fl">Eklenecek Miktar (${esc(s.unit)})</label>
    <input id="stVal" class="inp" inputmode="decimal">
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="applyStockAdd('${sid}')">Stoğa Ekle</button></div>`);
  $('#stVal').focus();
}
function applyStockAdd(sid){
  const s=db.stock.find(x=>x.id===sid); const v=num($('#stVal').value);
  if(v<=0){toast('Pozitif bir miktar girin','err');return}
  s.qty=+(s.qty+v).toFixed(3);
  db.stockLog.push({ts:Date.now(), u:user.name, name:s.name, delta:v, reason:'Sayım'});
  saveDB(); closeModal(); render(); toast(s.name+' stoğuna '+fmtQ(v)+' '+s.unit+' eklendi','ok');
}
function openStockEdit(sid){
  const s=db.stock.find(x=>x.id===sid);
  showModal(`<div class="m-head"><h3>Stok Düzenle — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Yeni Stok Miktarı (${esc(s.unit)})</label>
    <input id="stVal" class="inp" inputmode="decimal" value="${s.qty}">
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="applyStockEdit('${sid}')">Kaydet</button></div>`);
}
function applyStockEdit(sid){
  const s=db.stock.find(x=>x.id===sid); const v=num($('#stVal').value);
  const delta=+(v-s.qty).toFixed(3);
  s.qty=v;
  db.stockLog.push({ts:Date.now(), u:user.name, name:s.name, delta, reason:'Düzeltme'});
  saveDB(); closeModal(); render(); toast('Stok güncellendi','ok');
}
