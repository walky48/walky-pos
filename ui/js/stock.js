'use strict';

function stockCatList(){
  return [...new Set([...db.stockCats, ...db.stock.map(s=>s.cat)])];
}
function stockCatChipsHTML(){
  const cats=stockCatList();
  if(!cats.length) return '';
  const used=new Set(db.stock.map(s=>s.cat));
  return `<div class="sect"><div class="st">KATEGORİLER</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${cats.map((c,i)=>{
      const empty=!used.has(c);
      return `<span class="chip">${esc(c)} <span style="cursor:pointer;font-weight:800" onclick="openRenameStockCat(${i})" title="Yeniden adlandır">✏️</span>${empty?` <span style="cursor:pointer;font-weight:800" onclick="delStockCat(${i})" title="Boş kategoriyi sil">✕</span>`:''}</span>`;
    }).join('')}
    </div></div>`;
}
function delStockCat(i){
  const name=stockCatList()[i]; if(name===undefined) return;
  if(db.stock.some(s=>s.cat===name)){toast('Bu kategoride malzeme var, önce malzemeleri taşıyın/silin','err');return}
  const ci=db.stockCats.indexOf(name);
  if(ci>=0) db.stockCats.splice(ci,1);
  saveDB(); render(); toast(name+' kategorisi silindi','ok');
}
function openRenameStockCat(i){
  const name=stockCatList()[i]; if(name===undefined) return;
  showModal(`<div class="m-head"><h3>Kategoriyi Yeniden Adlandır</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Yeni Ad</label>
    <input id="rscName" class="inp" value="${esc(name)}" autocomplete="off">
    <p class="muted tiny mt8">Bu kategorideki tüm malzemeler yeni ada taşınır. Var olan başka bir kategori adı girerseniz, ikisi birleşir.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="applyRenameStockCat(${i})">Kaydet</button></div>`);
  $('#rscName').focus();
}
function applyRenameStockCat(i){
  const oldName=stockCatList()[i]; if(oldName===undefined) return;
  const newName=$('#rscName').value.trim();
  if(!newName){toast('Kategori adı boş olamaz','err');return}
  if(newName!==oldName){
    db.stock.forEach(s=>{ if(s.cat===oldName) s.cat=newName; });
    const ci=db.stockCats.indexOf(oldName);
    if(ci>=0){
      if(db.stockCats.some((c,j)=>j!==ci && c.toLowerCase()===newName.toLowerCase())) db.stockCats.splice(ci,1);
      else db.stockCats[ci]=newName;
    }
  }
  saveDB(); closeModal(); render(); toast('Kategori güncellendi ✓','ok');
}
function viewStock(){
  const canEdit = user.role==='admin';
  const cats=stockCatList();
  let grandTotal=0;
  const sections=cats.map(cat=>{
    const items=db.stock.filter(s=>s.cat===cat);
    if(!items.length) return '';
    let catTotal=0;
    const rows=items.map(s=>{
      const lineTotal=stockLineValue(s);
      catTotal+=lineTotal;
      const miktar = s.bottleCl
        ? `${fmtQ(s.qty)} adet + ${fmtQ(s.extraCl||0)} cl <span class="muted tiny">(${fmtQ(stockTotalCl(s))} cl toplam)</span>`
        : `${fmtQ(s.qty)} ${esc(s.unit)}`;
      return `<tr>
        <td>${esc(s.name)}</td>
        <td data-lbl="Miktar">${miktar}</td>
        <td class="num right" data-lbl="Fiyat">${fmt(s.price||0)}${s.bottleCl?' <span class="muted tiny">/şişe</span>':''}</td>
        <td class="num right" data-lbl="Toplam">${fmt(lineTotal)}</td>
        <td class="right tdact">
          <button class="btn sm" onclick="openStockAdd('${s.id}')">+ Sayım</button>
          ${canEdit?`<button class="btn sm ghost" onclick="openStockEdit('${s.id}')">Düzenle</button>
          <button class="btn sm red" onclick="askDelStock('${s.id}')">Sil</button>`:''}
        </td></tr>`;
    }).join('');
    grandTotal+=catTotal;
    return `<div class="sect"><div class="st">${esc(cat)}</div>
      <table class="dt"><thead><tr><th>Ürün</th><th>Miktar</th><th class="right">Fiyat</th><th class="right">Toplam</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="mini-row"><span><b>Kategori Toplamı</b></span><span class="v accent"><b>${fmt(catTotal)}</b></span></div>
    </div>`;
  }).join('');
  const log=db.stockLog.slice(-12).reverse().map(l=>
    `<div class="mini-row"><span class="muted small">${trDT(l.ts)} · ${esc(l.u)} · ${esc(l.reason)}</span>
     <span>${esc(l.name)} <b class="${l.delta>=0?'green':'red'}">${l.delta>=0?'+':''}${fmtQ(l.delta)}</b></span></div>`).join('');
  return `<div class="page-head">
      <div><h1>Stok Durumu</h1></div>
      <div class="head-tools">
        <button class="btn sm" onclick="printStockReport()">🖨️ Stok Çıktısı Al</button>
        ${canEdit?`<button class="btn sm" onclick="openNewStockCatModal()">+ Yeni Kategori</button>
        <button class="btn accent sm" onclick="openNewStockModal()">+ Yeni Stok Kalemi</button>`:''}
      </div></div>
    <div class="mini-row"><span><b>Toplam Stok Değeri</b></span><span class="v accent"><b>${fmt(grandTotal)}</b></span></div>
    ${canEdit?stockCatChipsHTML():''}
    ${sections}
    ${log?`<div class="sect"><div class="st">Son Stok Hareketleri</div>${log}</div>`:''}`;
}
function openNewStockCatModal(){
  showModal(`<div class="m-head"><h3>Yeni Kategori</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Kategori Adı</label>
    <input id="nscName" class="inp" autocomplete="off">
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="createStockCat()">Ekle</button></div>`);
  $('#nscName').focus();
}
function createStockCat(){
  const name=$('#nscName').value.trim();
  if(!name){toast('Kategori adı girin','err');return}
  if(stockCatList().some(c=>c.toLowerCase()===name.toLowerCase())){toast('Bu kategori zaten var','err');return}
  db.stockCats.push(name);
  saveDB(); closeModal(); render(); toast(name+' kategorisi eklendi ✓','ok');
}
function openNewStockModal(){
  const cats=stockCatList();
  const catOpts=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')
    +`<option value="__new">➕ Yeni kategori…</option>`;
  const unitOpts=STOCK_UNITS.map(u=>`<option value="${u}">${u}</option>`).join('');
  showModal(`<div class="m-head"><h3>Yeni Stok Kalemi</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Malzeme Adı</label>
    <input id="nsName" class="inp" autocomplete="off">
    <label class="fl">Kategori</label>
    <select id="nsCat" class="inp" onchange="$('#nsCatNewWrap').style.display=this.value==='__new'?'block':'none'">${catOpts}</select>
    <div id="nsCatNewWrap" style="display:${cats.length?'none':'block'}">
      <label class="fl">Yeni Kategori Adı</label>
      <input id="nsCatNew" class="inp">
    </div>
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:12px">
      <input type="checkbox" id="nsBottle" onchange="$('#nsUnitWrap').style.display=this.checked?'none':'block'; $('#nsBottleClWrap').style.display=this.checked?'block':'none'"> Şişeli takip (adet + açık şişede kalan cl, alkoller için)
    </label>
    <div id="nsUnitWrap">
      <label class="fl">Birim</label>
      <select id="nsUnit" class="inp">${unitOpts}</select>
    </div>
    <div id="nsBottleClWrap" style="display:none">
      <label class="fl">Şişe Boyutu (cl)</label>
      <input id="nsBottleCl" class="inp" inputmode="decimal" value="70">
    </div>
    <label class="fl">Birim Fiyatı (₺, şişeli takipte şişe başı)</label>
    <input id="nsPrice" class="inp" inputmode="decimal" value="0">
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
  const isBottle=$('#nsBottle').checked;
  const unit=isBottle?'adet':$('#nsUnit').value;
  const bottleCl=isBottle?num($('#nsBottleCl').value):0;
  const low=num($('#nsLow').value), crit=num($('#nsCrit').value);
  const price=num($('#nsPrice').value);
  if(isBottle && bottleCl<=0){toast('Geçerli bir şişe boyutu (cl) girin','err');return}
  if(low<0||crit<0){toast('Geçerli eşik değerleri girin','err');return}
  if(price<0){toast('Geçerli bir fiyat girin','err');return}
  if(db.stock.some(s=>s.name.toLowerCase()===name.toLowerCase())){toast('Bu isimde bir stok kalemi zaten var','err');return}
  const item={id:uid(), name, cat, qty:0, unit, low, crit, price};
  if(isBottle){ item.bottleCl=bottleCl; item.extraCl=0; }
  db.stock.push(item);
  saveDB(); closeModal(); render(); toast(name+' stok listesine eklendi ✓','ok');
}
function askDelStock(sid){
  const s=db.stock.find(x=>x.id===sid); if(!s) return;
  const usedBy=db.menu.filter(m=>(m.recipe||[]).some(r=>r.s===sid));
  if(usedBy.length){
    toast(esc(s.name)+' şu ürünlerin reçetesinde kullanılıyor: '+usedBy.map(m=>m.name).join(', ')+' — önce reçeteden çıkarın','err');
    return;
  }
  showModal(`<div class="m-head"><h3>Stok Kalemini Sil</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p><b>${esc(s.name)}</b> stok listesinden kalıcı olarak silinecek. Geçmiş stok hareketleri etkilenmez.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="delStock('${sid}')">Evet, Sil</button></div>`);
}
function delStock(sid){
  const s=db.stock.find(x=>x.id===sid); if(!s) return;
  db.stock=db.stock.filter(x=>x.id!==sid);
  saveDB(); closeModal(); render(); toast(s.name+' stok listesinden silindi','ok');
}
function openStockAdd(sid){
  const s=db.stock.find(x=>x.id===sid);
  if(s.bottleCl){
    showModal(`<div class="m-head"><h3>Sayım Girişi — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
      <p class="muted small">Mevcut: <b>${fmtQ(s.qty)} adet + ${fmtQ(s.extraCl||0)} cl</b> (toplam ${fmtQ(stockTotalCl(s))} cl). Yeni gelen kapalı şişe adedini girin.</p>
      <label class="fl">Eklenecek Şişe (adet)</label>
      <input id="stVal" class="inp" inputmode="decimal">
      <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="applyStockAddBottle('${sid}')">Stoğa Ekle</button></div>`);
    $('#stVal').focus();
    return;
  }
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
function applyStockAddBottle(sid){
  const s=db.stock.find(x=>x.id===sid); const v=num($('#stVal').value);
  if(v<=0){toast('Pozitif bir adet girin','err');return}
  s.qty=+(s.qty+v).toFixed(0);
  db.stockLog.push({ts:Date.now(), u:user.name, name:s.name, delta:v*s.bottleCl, reason:'Sayım (+'+fmtQ(v)+' şişe)'});
  saveDB(); closeModal(); render(); toast(s.name+' stoğuna '+fmtQ(v)+' adet eklendi','ok');
}
function openStockEdit(sid){
  const s=db.stock.find(x=>x.id===sid);
  if(s.bottleCl){
    showModal(`<div class="m-head"><h3>Stok Düzenle — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
      <p class="muted tiny">Şişe boyutu: ${fmtQ(s.bottleCl)} cl. Şu an: ${fmtQ(stockTotalCl(s))} cl toplam.</p>
      <label class="fl">Tam Şişe (adet)</label>
      <input id="stAdet" class="inp" inputmode="decimal" value="${s.qty}">
      <label class="fl">Açık Şişede Kalan (cl)</label>
      <input id="stCl" class="inp" inputmode="decimal" value="${s.extraCl||0}">
      <label class="fl">Birim Fiyatı (₺, şişe başı)</label>
      <input id="stPrice" class="inp" inputmode="decimal" value="${s.price||0}">
      <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="applyStockEditBottle('${sid}')">Kaydet</button></div>`);
    return;
  }
  showModal(`<div class="m-head"><h3>Stok Düzenle — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Yeni Stok Miktarı (${esc(s.unit)})</label>
    <input id="stVal" class="inp" inputmode="decimal" value="${s.qty}">
    <label class="fl">Birim Fiyatı (₺)</label>
    <input id="stPrice" class="inp" inputmode="decimal" value="${s.price||0}">
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="applyStockEdit('${sid}')">Kaydet</button></div>`);
}
function applyStockEdit(sid){
  const s=db.stock.find(x=>x.id===sid); const v=num($('#stVal').value), price=num($('#stPrice').value);
  if(price<0){toast('Geçerli bir fiyat girin','err');return}
  const delta=+(v-s.qty).toFixed(3);
  s.qty=v;
  s.price=price;
  db.stockLog.push({ts:Date.now(), u:user.name, name:s.name, delta, reason:'Düzeltme'});
  saveDB(); closeModal(); render(); toast('Stok güncellendi','ok');
}
function applyStockEditBottle(sid){
  const s=db.stock.find(x=>x.id===sid);
  const adet=num($('#stAdet').value), cl=num($('#stCl').value), price=num($('#stPrice').value);
  if(adet<0||cl<0){toast('Geçerli miktarlar girin','err');return}
  if(price<0){toast('Geçerli bir fiyat girin','err');return}
  const oldTotal=stockTotalCl(s);
  s.qty=adet; s.extraCl=cl; s.price=price;
  const delta=+(stockTotalCl(s)-oldTotal).toFixed(3);
  db.stockLog.push({ts:Date.now(), u:user.name, name:s.name, delta, reason:'Düzeltme (cl)'});
  saveDB(); closeModal(); render(); toast('Stok güncellendi','ok');
}
/* muhasebenin ay başı sayımla karşılaştırabilmesi için, istenildiği anda A4
   normal yazıcıdan (termal fiş yazıcısından bağımsız, bkz. ui/js/print.js
   #printArea 72mm kısıtı) tam stok dökümü alınabilmesi — ayrı bir pencerede
   statik HTML olarak üretilir, tarayıcının kendi yazdırma diyaloğunu açar. */
function stockReportHTML(){
  const cats=stockCatList();
  let grandTotal=0;
  const sections=cats.map(cat=>{
    const items=db.stock.filter(s=>s.cat===cat);
    if(!items.length) return '';
    let catTotal=0;
    const rows=items.map(s=>{
      const lineTotal=stockLineValue(s);
      catTotal+=lineTotal;
      const miktar = s.bottleCl
        ? `${fmtQ(s.qty)} adet + ${fmtQ(s.extraCl||0)} cl (${fmtQ(stockTotalCl(s))} cl toplam)`
        : `${fmtQ(s.qty)} ${esc(s.unit)}`;
      return `<tr><td>${esc(s.name)}</td><td>${miktar}</td><td class="r">${fmt(s.price||0)}</td><td class="r">${fmt(lineTotal)}</td></tr>`;
    }).join('');
    grandTotal+=catTotal;
    return `<h3>${esc(cat)}</h3>
      <table><thead><tr><th>Ürün</th><th>Miktar</th><th class="r">Fiyat</th><th class="r">Toplam</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="cat-tot">Kategori Toplamı: <b>${fmt(catTotal)}</b></div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Stok Durumu Raporu</title>
  <style>
    @page{size:A4;margin:14mm}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px}
    h1{font-size:19px;margin:0 0 2px}
    h3{font-size:13px;margin:16px 0 4px;border-bottom:1px solid #333;padding-bottom:2px}
    .sub{color:#555;font-size:11px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:2px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:11.5px}
    th{background:#f0f0f0}
    .r{text-align:right}
    .cat-tot{text-align:right;font-size:12px;margin:2px 0 4px}
    .grand{margin-top:18px;padding-top:8px;border-top:2px solid #111;font-size:15px;text-align:right;font-weight:bold}
  </style></head>
  <body>
    <h1>${esc(db.settings.businessName||'Restoranım')} — Stok Durumu Raporu</h1>
    <div class="sub">Çıktı: ${trDate(iso())} ${trTime(Date.now())} · Alan: ${esc(user.name)}</div>
    ${sections}
    <div class="grand">Toplam Stok Değeri: ${fmt(grandTotal)}</div>
  </body></html>`;
}
function printStockReport(){
  const w=window.open('', '_blank');
  if(!w){toast('Yeni sekme açılamadı, açılır pencere engelleniyor olabilir','err');return}
  w.document.open(); w.document.write(stockReportHTML()); w.document.close();
  w.focus();
  setTimeout(()=>{ try{ w.print() }catch(e){} }, 300);
}
