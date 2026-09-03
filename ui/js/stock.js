'use strict';

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
      <div><h1>Stok Durumu</h1></div>
      <div class="head-tools">
        <button class="chip ${stockFilter==='all'?'on':''}" onclick="stockFilter='all';render()">Tümü</button>
        <button class="chip ${stockFilter==='ok'?'on':''}" onclick="stockFilter='ok';render()"><span class="dot" style="background:var(--green)"></span>Normal <span class="cnt">${counts.ok}</span></button>
        <button class="chip ${stockFilter==='low'?'on':''}" onclick="stockFilter='low';render()"><span class="dot" style="background:var(--amber)"></span>Azalıyor <span class="cnt">${counts.low}</span></button>
        <button class="chip ${stockFilter==='crit'?'on':''}" onclick="stockFilter='crit';render()"><span class="dot" style="background:var(--red)"></span>Kritik <span class="cnt">${counts.crit}</span></button>
        ${canEdit?`<button class="btn accent sm" onclick="openNewStockModal()">+ Yeni Stok Kalemi</button>`:''}
      </div></div>
    ${sections}
    ${log?`<div class="sect"><div class="st">Son Stok Hareketleri</div>${log}</div>`:''}`;
}
/* --- yeni stok kalemi (malzeme) oluşturma — admin --- */
function openNewStockModal(){
  const cats=[...new Set(db.stock.map(s=>s.cat))];
  const catOpts=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')
    +`<option value="__new">➕ Yeni kategori…</option>`;
  showModal(`<div class="m-head"><h3>Yeni Stok Kalemi</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Malzeme Adı</label>
    <input id="nsName" class="inp" autocomplete="off">
    <label class="fl">Kategori</label>
    <select id="nsCat" class="inp" onchange="$('#nsCatNewWrap').style.display=this.value==='__new'?'block':'none'">${catOpts}</select>
    <div id="nsCatNewWrap" style="display:${cats.length?'none':'block'}">
      <label class="fl">Yeni Kategori Adı</label>
      <input id="nsCatNew" class="inp">
    </div>
    <label class="fl">Birim</label>
    <input id="nsUnit" class="inp" placeholder="kg, lt, adet, cl...">
    <label class="fl">Uyarı Eşikleri</label>
    <div class="range-bar">
      <div class="fld"><span>Az Uyarı</span><input id="nsLow" class="inp" style="width:110px" inputmode="decimal" value="10"></div>
      <div class="fld"><span>Kritik</span><input id="nsCrit" class="inp" style="width:110px" inputmode="decimal" value="3"></div>
    </div>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="createStockItem()">Ekle</button></div>`);
  $('#nsName').focus();
}
function createStockItem(){
  const name=$('#nsName').value.trim();
  if(!name){toast('Malzeme adı girin','err');return}
  let cat=$('#nsCat').value;
  if(cat==='__new'){cat=$('#nsCatNew').value.trim();if(!cat){toast('Kategori adı girin','err');return}}
  const unit=$('#nsUnit').value.trim();
  if(!unit){toast('Birim girin','err');return}
  const low=num($('#nsLow').value), crit=num($('#nsCrit').value);
  if(low<0||crit<0){toast('Geçerli eşik değerleri girin','err');return}
  if(db.stock.some(s=>s.name.toLowerCase()===name.toLowerCase())){toast('Bu isimde bir stok kalemi zaten var','err');return}
  db.stock.push({id:uid(), name, cat, qty:0, unit, low, crit});
  saveDB(); closeModal(); render(); toast(name+' stok listesine eklendi ✓','ok');
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
