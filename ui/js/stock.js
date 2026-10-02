'use strict';

function stockCatList(){
  return [...new Set([...db.stockCats, ...db.stock.map(s=>s.cat)])];
}
/* Stok Durumu ve Genel Stok'taki kategori başlıklarının en sağında kullanılan
   daralt/genişlet butonu — çok sayıda kategori arasında aranan kategoriyi
   manuel bulmayı kolaylaştırır. Kategori adına göre (iki sekme arasında da
   ortak) tutulur, bkz. backend/state.js stockCollapsedCats. */
function stockCatHeaderHTML(cat){
  const collapsed=stockCollapsedCats.has(cat);
  return `<div class="st" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
    <span>${esc(cat)}</span>
    <span class="icon-b" style="cursor:pointer;font-size:12px" title="${collapsed?'Genişlet':'Daralt'}" onclick="toggleStockCat('${esc(cat)}')">${collapsed?'▸':'▾'}</span>
  </div>`;
}
function toggleStockCat(cat){
  if(stockCollapsedCats.has(cat)) stockCollapsedCats.delete(cat); else stockCollapsedCats.add(cat);
  render();
}
function stockCatChipsHTML(){
  const cats=stockCatList();
  if(!cats.length) return '';
  const used=new Set(db.stock.map(s=>s.cat));
  return `<div class="sect"><div class="st">KATEGORİLER</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${cats.map((c,i)=>{
      const empty=!used.has(c);
      return `<span class="chip">${esc(c)} <span style="cursor:pointer;font-weight:800" onclick="openRenameStockCat(${i})" title="Yeniden adlandır">Değiştir</span>${empty?` <span style="cursor:pointer;font-weight:800" onclick="delStockCat(${i})" title="Boş kategoriyi sil">✕</span>`:''}</span>`;
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
  saveDB(); closeModal(); render(); toast('Kategori güncellendi','ok');
}
function viewStock(){
  const tabs=[['durum','Stok Durumu'],['genel','Genel Stok'],['giris','Mal Girişi']];
  const tabBar=`<div class="seg mb16">${tabs.map(([k,l])=>
    `<button class="seg-b ${stockTab===k?'on':''}" onclick="setStockTab('${k}')">${l}</button>`).join('')}</div>`;
  const body = stockTab==='genel' ? stockGenelHTML() : stockTab==='giris' ? stockMalGirisiHTML() : stockDurumHTML();
  return tabBar+body;
}
function setStockTab(t){ stockTab=t; render(); }
function stockDurumHTML(){
  const canEdit = user.role==='admin';
  return `<div class="page-head">
      <div><h1>Stok Durumu</h1></div>
      <div class="head-tools">
        <button class="btn sm" onclick="exportStockExcel()">Excel İndir</button>
        ${canEdit?`<button class="btn sm red" onclick="askResetStock()">Stoğu Sıfırla</button>
        <button class="btn sm" onclick="openNewStockCatModal()">+ Yeni Kategori</button>
        <button class="btn accent sm" onclick="openNewStockModal()">+ Yeni Stok Kalemi</button>`:''}
      </div></div>
    <input id="sdQ" class="inp mb16" style="max-width:320px" placeholder="Ürün ara…" value="${esc(stockDurumQuery)}" oninput="stockDurumQuery=this.value;renderStockDurumBody()">
    ${canEdit?stockCatChipsHTML():''}
    <div id="stockDurumBody">${stockDurumBodyHTML()}</div>
    ${stockSaveBarHTML()}`;
}
function renderStockDurumBody(){
  const el=$('#stockDurumBody'); if(el) el.innerHTML=stockDurumBodyHTML();
}
function stockDurumBodyHTML(){
  const canEdit = user.role==='admin';
  const q=(stockDurumQuery||'').toLowerCase();
  const cats=stockCatList();
  const list=stockView(), changed=stockChangedIds(list);
  let grandTotal=0;
  const sections=cats.map(cat=>{
    const items=list.filter(s=>s.cat===cat && (!q || s.name.toLowerCase().includes(q)));
    if(!items.length) return '';
    let catTotal=0;
    const rows=items.map(s=>{
      const lineTotal=stockLineValue(s);
      catTotal+=lineTotal;
      const miktar = s.bottleCl
        ? `${fmtQ(s.qty)} adet + ${fmtQ(s.extraCl||0)} cl <span class="muted tiny">(${fmtQ(stockTotalCl(s))} cl toplam)</span>`
        : `${fmtQ(s.qty)} ${esc(s.unit)}`;
      return `<tr>
        <td>${esc(s.name)}${changed.has(s.id)?' <span class="badge low">Kaydedilmedi</span>':''}</td>
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
    const collapsed=stockCollapsedCats.has(cat);
    return `<div class="sect">${stockCatHeaderHTML(cat)}
      ${collapsed?'':`<table class="dt"><thead><tr><th>Ürün</th><th>Miktar</th><th class="right">Fiyat</th><th class="right">Toplam</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="mini-row"><span><b>Kategori Toplamı</b></span><span class="v accent"><b>${fmt(catTotal)}</b></span></div>`}
    </div>`;
  }).join('');
  const log=db.stockLog.slice(-12).reverse().map(l=>
    `<div class="mini-row"><span class="muted small">${trDT(l.ts)} · ${esc(l.u)} · ${esc(l.reason)}</span>
     <span>${esc(l.name)}${l.delta==null?'':` <b class="${l.delta>=0?'green':'red'}">${l.delta>=0?'+':''}${fmtQ(l.delta)}</b>`}</span></div>`).join('');
  return `<div class="mini-row"><span><b>Toplam Stok Değeri</b></span><span class="v accent"><b>${fmt(grandTotal)}</b></span></div>
    ${sections || (q?'<div class="muted small mt12">Aramanızla eşleşen ürün bulunamadı.</div>':'')}
    ${log?`<div class="sect"><div class="st">Son Stok Hareketleri</div>${log}</div>`:''}`;
}
/* ---------- Stok Durumu taslağı: Stoğu Kaydet ---------- */
/* Stok Durumu'ndaki düzeltme (Düzenle), sayım (+ Sayım) ve Stoğu Sıfırla
   anında kaydedilmez: işlem listesi olarak bu cihazda taslakta tutulur,
   ekranda taslak uygulanmış hali gösterilir; sayfanın altındaki Stoğu
   Kaydet'e basınca hepsi tek seferde kaydedilip sunucuya gönderilir (bkz.
   backend/sync.js commitBatch). Sayım sırasında kasada sipariş girilirken
   her düzeltmenin ayrı ayrı gönderilmesi, kasanın gönderimleriyle çakışıp
   bazı düzeltmelerin kaybolmasına yol açıyordu. Taslak tarayıcıda saklanır
   ki sayfa yenilense ya da telefon kilitlense de kaybolmasın. Kalem
   ekleme/silme ve kategori işlemleri eskisi gibi anında kaydedilir. */
let stockDraftCache=null, stockDraftCacheKey=null, stockCommitting=false;
function stockDraftKey(){return 'walky_stock_draft_v1:'+(remoteMode&&remoteSession?remoteSession.url+'|'+remoteSession.tenantName:'kasa')}
function stockDraft(){
  const k=stockDraftKey();
  if(stockDraftCacheKey!==k){
    stockDraftCacheKey=k; stockDraftCache=[];
    try{ const r=localStorage.getItem(k); if(r) stockDraftCache=JSON.parse(r)||[]; }catch(e){}
  }
  return stockDraftCache;
}
function persistStockDraft(){
  try{ const d=stockDraft(); if(d.length) localStorage.setItem(stockDraftKey(),JSON.stringify(d)); else localStorage.removeItem(stockDraftKey()); }catch(e){}
}
function addStockOp(op){ stockDraft().push(Object.assign({}, op, {u:user.name, ts:Date.now()})); persistStockDraft(); }
function stockDraftToast(msg){ toast(msg+' — kaydetmek için Stoğu Kaydet','ok'); }
/* taslaktaki işlemleri verilen stok listesine sırayla uygular; log
   verilirse her işlem için stok hareketi yazar (batchId ile işaretli) */
function applyStockOps(stock, ops, log, batchId){
  ops.forEach(op=>{
    const L=e=>{ if(log) log.push(Object.assign(e, {ts:op.ts, u:op.u, b:batchId})); };
    if(op.t==='reset'){
      let n=0;
      stock.forEach(s=>{ if((s.qty||0)!==0 || (s.extraCl||0)!==0) n++; s.qty=0; if(s.extraCl) s.extraCl=0; });
      L({name:'Tüm stok', delta:null, reason:`Stok sıfırlandı (${n} kalem)`});
      return;
    }
    const s=stock.find(x=>x.id===op.sid); if(!s) return;
    if(op.t==='set'){
      const before=stockTotalCl(s), oldName=s.name, wasBottle=!!s.bottleCl;
      let dropped=0;
      /* takip şekli değişimi (bkz. setStockTracking) — sadece adet birimli kalemlerde */
      if(s.unit==='adet'){
        if(op.trk==='adet' && wasBottle) dropped=setStockTracking(s, 0);
        else if(op.trk==='bottle' && !wasBottle && op.bcl>0) setStockTracking(s, op.bcl, op.cl);
      }
      s.name=op.name; s.qty=op.qty; s.price=op.price; if(s.bottleCl) s.extraCl=op.cl||0;
      const modeChanged=wasBottle!==!!s.bottleCl;
      /* takip şekli değişince cl ile adet karşılaştırılamaz — fark yazılmaz */
      L({name:s.name, delta:modeChanged?null:+(stockTotalCl(s)-before).toFixed(3),
         reason:(s.bottleCl?'Düzeltme (cl)':'Düzeltme')
           +(modeChanged?' · takip: '+(s.bottleCl?'adet + cl':'sadece adet')+(dropped?` (açık şişe ${fmtQ(dropped)} cl yok sayıldı)`:''):'')
           +stockRenameNote(oldName,s)});
    }else if(op.t==='add'){
      if(s.bottleCl){ s.qty=+((s.qty||0)+op.v).toFixed(0); L({name:s.name, delta:op.v*s.bottleCl, reason:'Sayım (+'+fmtQ(op.v)+' şişe)'}); }
      else{ s.qty=+((s.qty||0)+op.v).toFixed(3); L({name:s.name, delta:op.v, reason:'Sayım'}); }
    }
  });
}
/* ekranda gösterilen stok: kaydedilmiş stok + taslak */
function stockView(){
  const d=stockDraft();
  if(!d.length) return db.stock;
  const c=JSON.parse(JSON.stringify(db.stock));
  applyStockOps(c, d);
  return c;
}
function stockChangedIds(list){
  if(!stockDraft().length) return new Set();
  const m=new Map(db.stock.map(s=>[s.id,s]));
  return new Set(list.filter(p=>{const s=m.get(p.id);return !s||s.qty!==p.qty||(s.extraCl||0)!==(p.extraCl||0)||(s.bottleCl||0)!==(p.bottleCl||0)||s.price!==p.price||s.name!==p.name}).map(p=>p.id));
}
function stockDraftNavSuffix(){const n=stockDraft().length;return n?` (${n} kaydedilmemiş)`:''}
function stockSaveBarHTML(){
  const d=stockDraft();
  if(!d.length) return `<div class="stock-save-bar"><span class="muted small">Düzeltme, sayım ve sıfırlama bu butona basılana kadar kaydedilmez.</span><span class="grow"></span><button class="btn accent" disabled>Stoğu Kaydet</button></div>`;
  const who=[...new Set(d.map(o=>o.u))].join(', ');
  return `<div class="stock-save-bar pending"><span><b>${d.length}</b> kaydedilmemiş değişiklik <span class="muted small">(${esc(who)})</span></span><span class="grow"></span>
    <button class="btn ghost" ${stockCommitting?'disabled':''} onclick="askDiscardStockDraft()">Geri Al</button>
    <button class="btn accent" ${stockCommitting?'disabled':''} onclick="commitStockDraft()">${stockCommitting?'Kaydediliyor…':'Stoğu Kaydet'}</button></div>`;
}
async function commitStockDraft(){
  const ops=stockDraft().slice();
  if(!ops.length || stockCommitting) return;
  stockCommitting=true; render();
  const ok=await commitBatch((st,b)=>{
    if(!st.stockLog) st.stockLog=[];
    applyStockOps(st.stock||[], ops, st.stockLog, b);
  }, uid());
  stockCommitting=false;
  if(ok){ stockDraft().splice(0, ops.length); persistStockDraft(); toast('Stok kaydedildi','ok'); }
  render();
}
function askDiscardStockDraft(){
  const n=stockDraft().length; if(!n) return;
  showModal(`<div class="m-head"><h3>Değişiklikleri Geri Al</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p>Kaydedilmemiş <b>${n}</b> değişiklik silinecek, stok son kaydedilmiş haline döner.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="discardStockDraft()">Geri Al</button></div>`);
}
function discardStockDraft(){
  stockDraft().length=0; persistStockDraft();
  closeModal(); render(); toast('Kaydedilmemiş değişiklikler geri alındı','ok');
}
/* ---------- Genel Stok: tarih aralığına göre tüketim raporu ---------- */
/* Ayrı bir tüketim logu tutmuyoruz — bkz. backend/logic.js consumptionInRange:
   seçilen aralıktaki GERÇEK satışlar (db.sales) üzerinden geriye dönük hesaplanır. */
function stockGenelHTML(){
  const q=(stockGenelQuery||'').toLowerCase();
  const agg=consumptionInRange(stockGenelFrom, stockGenelTo);
  let grandTotal=0;
  const sections=stockCatList().map(cat=>{
    const items=db.stock.filter(s=>s.cat===cat && (!q || s.name.toLowerCase().includes(q)));
    if(!items.length) return '';
    let catTotal=0;
    const rows=items.map(s=>{
      const consumedQty=agg[s.id]||0;
      const val=consumedValue(s, consumedQty);
      catTotal+=val;
      const miktar = s.bottleCl ? `${fmtQ(consumedQty)} cl` : `${fmtQ(consumedQty)} ${esc(s.unit)}`;
      return `<tr>
        <td>${esc(s.name)}</td>
        <td data-lbl="Tüketilen Miktar">${miktar}</td>
        <td class="num right" data-lbl="Tüketilen Tutar">${fmt(val)}</td></tr>`;
    }).join('');
    grandTotal+=catTotal;
    const collapsed=stockCollapsedCats.has(cat);
    return `<div class="sect">${stockCatHeaderHTML(cat)}
      ${collapsed?'':`<table class="dt"><thead><tr><th>Ürün</th><th>Tüketilen Miktar</th><th class="right">Tüketilen Tutar</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="mini-row"><span><b>Kategori Toplamı</b></span><span class="v accent"><b>${fmt(catTotal)}</b></span></div>`}
    </div>`;
  }).join('');
  return `<div class="page-head"><div><h1>Genel Stok</h1><div class="sub">Seçili tarih aralığında satışlar üzerinden hesaplanan tüketim</div></div></div>
    <div class="panel mb16">
      <div class="range-bar">
        <div class="fld"><span>Başlangıç</span><input type="date" id="sgF" class="inp dte" value="${stockGenelFrom}"></div>
        <div class="fld"><span>Bitiş</span><input type="date" id="sgT" class="inp dte" value="${stockGenelTo}"></div>
        <input id="sgQ" class="inp" style="flex:1;min-width:160px" placeholder="Ürün ara…" value="${esc(stockGenelQuery)}" onkeydown="if(event.key==='Enter')applyStockGenelFilter()">
        <button class="btn accent" onclick="applyStockGenelFilter()">Göster</button>
        <button class="btn" onclick="exportStockGenelExcel()">Excel İndir</button>
      </div>
    </div>
    <div class="mini-row"><span><b>Toplam Tüketilen Tutar</b> <span class="muted small">(${trDate(stockGenelFrom)} – ${trDate(stockGenelTo)})</span></span><span class="v accent"><b>${fmt(grandTotal)}</b></span></div>
    ${sections || '<div class="muted small mt12">Bu aralıkta/aramada sonuç bulunamadı.</div>'}`;
}
function applyStockGenelFilter(){
  let f=$('#sgF').value||iso(), t=$('#sgT').value||iso();
  if(f>t){const x=f;f=t;t=x;}
  stockGenelFrom=f; stockGenelTo=t; stockGenelQuery=$('#sgQ').value.trim();
  render();
}
/* ---------- Mal Girişi: manuel tedarikçi/geliş kaydı ---------- */
/* Kaydedince ilgili stok kalemine otomatik eklenir ve geliş fiyatı güncellenir
   (bkz. saveMalGirisi) — Genel Stok/Stok Durumu'ndaki "Toplam" hesapları bu
   güncel fiyatı kullanır. Ayrıca db.goodsReceipts'e ayrı bir kayıt düşer ki
   muhasebe hangi malın hangi firmadan, hangi tarihte, ne kadara geldiğini
   görebilsin — bu tablo Stok Durumu'ndaki miktardan bağımsız bir defterdir. */
function stockMalGirisiHTML(){
  const canEdit = user.role==='admin';
  if(!db.stock.length){
    return `<div class="page-head"><div><h1>Mal Girişi</h1></div></div>
      <div class="muted small">Önce Stok Durumu ekranından malzeme ekleyin.</div>`;
  }
  const cats=stockCatList().filter(cat=>db.stock.some(s=>s.cat===cat));
  const stockOpts=cats.map(cat=>{
    const items=db.stock.filter(s=>s.cat===cat).slice().sort((a,b)=>a.name.localeCompare(b.name,'tr'));
    return `<optgroup label="${esc(cat)}">${items.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`;
  }).join('');
  const firstS=db.stock.filter(s=>s.cat===cats[0]).slice().sort((a,b)=>a.name.localeCompare(b.name,'tr'))[0];
  const hintFor=s=> s&&s.bottleCl ? `Şişeli takip: miktar kapalı şişe/adet sayısıdır (şişe boyutu ${fmtQ(s.bottleCl)} cl).` : (s?`Birim: ${esc(s.unit)}`:'');
  const firmaOpts=[...new Set((db.goodsReceipts||[]).map(g=>g.supplier))].map(f=>`<option value="${esc(f)}">`).join('');
  const list=(db.goodsReceipts||[]).slice().reverse();
  /* kalem sonradan yeniden adlandırıldıysa (bkz. openStockEdit) güncel adı
     göster; kalem silindiyse kayıt anındaki ad kalır */
  const grName=g=>{const s=db.stock.find(x=>x.id===g.stockId);return s?s.name:g.stockName};
  const rows=list.map(g=>`<tr>
      <td>${trDate(g.date)}</td>
      <td data-lbl="Firma">${esc(g.supplier)}</td>
      <td data-lbl="Ürün">${esc(grName(g))}</td>
      <td class="num right" data-lbl="Miktar">${fmtQ(g.qty)}</td>
      <td class="num right" data-lbl="Birim Fiyat">${fmt(g.unitPrice)}</td>
      <td class="num right" data-lbl="Toplam">${fmt(g.qty*g.unitPrice)}</td>
      <td class="muted" data-lbl="Giren">${esc(g.by)}</td>
      ${canEdit?`<td class="right tdact"><button class="btn sm red" onclick="askDelGoodsReceipt('${g.id}')">Sil</button></td>`:''}
    </tr>`).join('');
  return `<div class="page-head"><div><h1>Mal Girişi</h1><div class="sub">Her mal geldiğinde firma/tarih/miktar/geliş fiyatı buradan kaydedilir</div></div>
      ${list.length?`<div class="head-tools"><button class="btn sm" onclick="exportMalGirisiExcel()">Excel İndir</button></div>`:''}</div>
    <div class="panel mb16">
      <div class="st" style="margin-bottom:12px">YENİ MAL GİRİŞİ</div>
      <div class="range-bar">
        <div class="fld"><span>Tarih</span><input type="date" id="giDate" class="inp dte" value="${iso()}"></div>
        <div class="fld" style="flex:1;min-width:160px"><span>Firma</span><input id="giFirma" class="inp" list="giFirmaList" placeholder="Tedarikçi adı" autocomplete="off"></div>
        <div class="fld" style="flex:1;min-width:180px"><span>Ürün</span><select id="giStock" class="inp" onchange="updateGiHint()">${stockOpts}</select></div>
      </div>
      <div class="range-bar mt8">
        <div class="fld"><span>Miktar</span><input id="giQty" class="inp" style="width:110px" inputmode="decimal"></div>
        <div class="fld"><span>Birim Fiyatı (₺)</span><input id="giPrice" class="inp" style="width:130px" inputmode="decimal"></div>
        <button class="btn accent" onclick="saveMalGirisi()">Kaydet</button>
      </div>
      <div id="giHint" class="muted tiny mt8">${hintFor(firstS)}</div>
      <datalist id="giFirmaList">${firmaOpts}</datalist>
    </div>
    <div class="sect"><div class="st">MAL GİRİŞİ GEÇMİŞİ</div>
    ${rows?`<table class="dt"><thead><tr><th>Tarih</th><th>Firma</th><th>Ürün</th><th class="right">Miktar</th><th class="right">Birim Fiyat</th><th class="right">Toplam</th><th>Giren</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${rows}</tbody></table>`
        :'<div class="muted small">Henüz mal girişi kaydı yok.</div>'}
    </div>`;
}
function updateGiHint(){
  const s=db.stock.find(x=>x.id===$('#giStock').value);
  const hint=$('#giHint'); if(!hint) return;
  hint.textContent = s&&s.bottleCl ? `Şişeli takip: miktar kapalı şişe/adet sayısıdır (şişe boyutu ${fmtQ(s.bottleCl)} cl).` : (s?`Birim: ${s.unit}`:'');
}
let malGirisiBusy=false;
async function saveMalGirisi(){
  if(malGirisiBusy) return;
  const sid=$('#giStock').value;
  const s=db.stock.find(x=>x.id===sid);
  if(!s){toast('Ürün seçin','err');return}
  const date=$('#giDate').value||iso();
  const supplier=$('#giFirma').value.trim();
  const qty=num($('#giQty').value), unitPrice=num($('#giPrice').value);
  if(!supplier){toast('Firma adı girin','err');return}
  if(qty<=0){toast('Geçerli bir miktar girin','err');return}
  if(unitPrice<0){toast('Geçerli bir birim fiyat girin','err');return}
  /* taslaktaki bir düzeltme/sıfırlama kaydedilince bu girişle gelen miktarın
     üzerine yazacağı için önce taslak kaydedilmeli */
  if(stockDraft().some(o=>o.t==='reset'||o.sid===sid)){toast('Bu ürün için Stok Durumu\'nda kaydedilmemiş değişiklik var — önce orada Stoğu Kaydet\'e basın','err');return}
  const rec={id:uid(), date, supplier, stockId:sid, qty, unitPrice, by:user.name, ts:Date.now()};
  malGirisiBusy=true;
  const ok=await commitBatch((st,b)=>{
    const x=(st.stock||[]).find(y=>y.id===rec.stockId); if(!x) return;
    x.qty = x.bottleCl ? +((x.qty||0)+qty).toFixed(0) : +((x.qty||0)+qty).toFixed(3);
    x.price=unitPrice;
    if(!st.stockLog) st.stockLog=[];
    st.stockLog.push({ts:rec.ts, u:rec.by, name:x.name, delta:x.bottleCl?qty*x.bottleCl:qty, reason:'Mal Girişi ('+supplier+')', b});
    st.goodsReceipts=st.goodsReceipts||[];
    st.goodsReceipts.push(Object.assign({}, rec, {stockName:x.name}));
  }, uid());
  malGirisiBusy=false;
  if(ok){ render(); toast('Mal girişi kaydedildi','ok'); }
}
function askDelGoodsReceipt(id){
  const g=(db.goodsReceipts||[]).find(x=>x.id===id); if(!g) return;
  showModal(`<div class="m-head"><h3>Mal Girişi Kaydını Sil</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p><b>${esc(g.stockName)}</b> — ${fmtQ(g.qty)} adet, ${esc(g.supplier)} (${trDate(g.date)}) kaydı silinecek. <b>Not:</b> bu, o sırada stoğa eklenen miktarı geri almaz — gerekirse stoğu Stok Durumu'ndan ayrıca düzeltin.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="delGoodsReceipt('${id}')">Evet, Sil</button></div>`);
}
function delGoodsReceipt(id){
  db.goodsReceipts=(db.goodsReceipts||[]).filter(g=>g.id!==id);
  saveDB(); closeModal(); render(); toast('Mal girişi kaydı silindi','ok');
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
  saveDB(); closeModal(); render(); toast(name+' kategorisi eklendi','ok');
}
function openNewStockModal(){
  const cats=stockCatList();
  const catOpts=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')
    +`<option value="__new">Yeni kategori…</option>`;
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
  saveDB(); closeModal(); render(); toast(name+' stok listesine eklendi','ok');
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
  const s=stockView().find(x=>x.id===sid);
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
  const s=stockView().find(x=>x.id===sid); const v=num($('#stVal').value);
  if(v<=0){toast('Pozitif bir miktar girin','err');return}
  addStockOp({t:'add', sid, v});
  closeModal(); render(); stockDraftToast(s.name+' +'+fmtQ(v)+' '+s.unit);
}
function applyStockAddBottle(sid){
  const s=stockView().find(x=>x.id===sid); const v=num($('#stVal').value);
  if(v<=0){toast('Pozitif bir adet girin','err');return}
  addStockOp({t:'add', sid, v});
  closeModal(); render(); stockDraftToast(s.name+' +'+fmtQ(v)+' adet');
}
/* Düzenle penceresi: adet birimli kalemlerde "Şişeli takip" kutusuyla açık
   şişede kalan cl takibi eklenip kaldırılabilir (bkz. setStockTracking) —
   ör. biralar sadece adet olarak düşmeli, alkoller adet + cl. Değişiklik diğer
   düzeltmeler gibi taslağa girer, Stoğu Kaydet ile kaydedilir. */
let stockEditSid=null, stockEditWasBottle=false;
function openStockEdit(sid){
  const s=stockView().find(x=>x.id===sid); if(!s) return;
  stockEditSid=sid; stockEditWasBottle=!!s.bottleCl;
  const track = s.unit==='adet' ? `<label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:12px">
      <input type="checkbox" id="stBottle" ${s.bottleCl?'checked':''} onchange="stEditToggleBottle()"> Şişeli takip (adet + açık şişede kalan cl, alkoller için)
    </label>
    <div id="stBclWrap">
      <label class="fl">Şişe Boyutu (cl)</label>
      <input id="stBcl" class="inp" inputmode="decimal" value="${s.bottleCl||''}" ${s.bottleCl?'readonly':'placeholder="ör. 70"'}>
    </div>` : '';
  showModal(`<div class="m-head"><h3>Stok Düzenle — ${esc(s.name)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Ürün Adı</label>
    <input id="stName" class="inp" value="${esc(s.name)}">
    ${track}
    <p id="stInfo" class="muted tiny mt8"></p>
    <label class="fl" id="stQtyLbl"></label>
    <input id="stQty" class="inp" inputmode="decimal" value="${s.qty}">
    <div id="stClWrap">
      <label class="fl">Açık Şişede Kalan (cl)</label>
      <input id="stCl" class="inp" inputmode="decimal" value="${s.extraCl||0}">
    </div>
    <label class="fl" id="stPriceLbl"></label>
    <input id="stPrice" class="inp" inputmode="decimal" value="${s.price||0}">
    <div id="stNote" class="muted small mt12"></div>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="applyStockEdit('${sid}')">Kaydet</button></div>`);
  stEditToggleBottle();
}
/* kutunun durumuna göre alanları, etiketleri ve uyarıları günceller */
function stEditToggleBottle(){
  const s=stockView().find(x=>x.id===stockEditSid); if(!s) return;
  const cb=$('#stBottle'), on=cb?cb.checked:false;
  const show=(id,v)=>{const el=$('#'+id); if(el) el.style.display=v?'block':'none'};
  show('stBclWrap', on); show('stClWrap', on);
  $('#stQtyLbl').textContent = on ? 'Tam Şişe (adet)' : `Stok Miktarı (${s.unit})`;
  $('#stPriceLbl').textContent = on ? 'Birim Fiyatı (₺, şişe başı)' : 'Birim Fiyatı (₺)';
  $('#stInfo').textContent = (on && stockEditWasBottle) ? `Şişe boyutu: ${fmtQ(s.bottleCl)} cl. Şu an: ${fmtQ(stockTotalCl(s))} cl toplam.` : '';
  $('#stNote').innerHTML = stockEditNoteHTML(s, on);
}
function stockEditNoteHTML(s, on){
  const was=!!s.bottleCl;
  if(on===was) return '';
  const parts=[];
  if(was && (s.extraCl||0)>0) parts.push(`Açık şişedeki <b>${fmtQ(s.extraCl)} cl</b> yok sayılacak; tam şişe sayısı aynı kalır (aşağıdan değiştirebilirsiniz).`);
  if(!was) parts.push('Şişe boyutunu girin. Tam şişe sayısı aynı kalır, açık şişede kalan cl 0 ile başlar (aşağıdan girebilirsiniz).');
  const uses=stockRecipeUses(s.id);
  if(uses.length){
    const list=uses.slice(0,4).map(u=>`${esc(u.menu)}: ${fmtQ(u.q)}`).join(', ')+(uses.length>4?` ve ${uses.length-4} satır daha`:'');
    parts.push(`Bu ürün menü reçetelerinde kullanılıyor (${list}). Reçete miktarları değişmez; bundan sonra <b>${on?'cl':'adet'}</b> olarak düşer (şu an ${on?'adet':'cl'} olarak düşüyor).`);
  }
  return parts.join('<br>');
}
/* düzenleme modalındaki ad alanı: boş ya da başka kalemle aynı adı reddeder.
   Reçeteler ve mal girişleri kalemi id ile tuttuğu için yeniden adlandırma
   başka bir yeri bozmaz; ad değiştiyse stok hareketine eski ad not düşülür
   ki eski adla kaydedilmiş geçmiş hareketler izlenebilsin. */
function stockEditName(s){
  const name=$('#stName').value.trim();
  if(!name){toast('Ürün adı boş olamaz','err');return null}
  if(stockView().some(x=>x.id!==s.id && x.name.toLowerCase()===name.toLowerCase())){toast('Bu isimde bir stok kalemi zaten var','err');return null}
  return name;
}
function stockRenameNote(oldName, s){return oldName!==s.name?' · eski ad: '+oldName:''}
function applyStockEdit(sid){
  const s=stockView().find(x=>x.id===sid); if(!s) return;
  const name=stockEditName(s); if(name===null) return;
  const cb=$('#stBottle'), on=cb?cb.checked:false, was=!!s.bottleCl;
  const qty=num($('#stQty').value), price=num($('#stPrice').value);
  const cl=on?num($('#stCl').value):0;
  let bcl=0;
  if(on && !was){
    bcl=num($('#stBcl').value);
    if(bcl<=0){toast('Geçerli bir şişe boyutu (cl) girin','err');return}
  }
  if(on && (qty<0||cl<0)){toast('Geçerli miktarlar girin','err');return}
  if(price<0){toast('Geçerli bir fiyat girin','err');return}
  const op={t:'set', sid, name, qty, price, cl};
  if(on!==was){ op.trk=on?'bottle':'adet'; if(on) op.bcl=bcl; }
  addStockOp(op);
  closeModal(); render(); stockDraftToast(name+' güncellendi');
}
/* ---------- Stoğu Sıfırla ---------- */
/* ay başı sayımına temiz başlamak için: tüm kalemlerin miktarını (adet ve
   açık şişe cl'si) sıfırlar; geliş fiyatlarına, kategorilere ve kalemlerin
   kendisine dokunmaz — ardından sayım "+ Sayım" ile girilir. Diğer stok
   düzeltmeleri gibi taslağa eklenir, Stoğu Kaydet ile kaydedilir; kayıttan
   sonra geri alınamadığı için onay penceresinde önce mevcut durumun Excel'i
   önerilir. Stok hareketlerine kalem başına ayrı satır yerine tek bir özet
   satır düşülür (bkz. applyStockOps) ki Son Stok Hareketleri listesi
   sıfırlama satırlarıyla dolmasın. */
function askResetStock(){
  if(user.role!=='admin') return;
  const n=stockView().filter(s=>(s.qty||0)!==0 || (s.extraCl||0)!==0).length;
  if(!n){toast('Tüm stok miktarları zaten sıfır','err');return}
  showModal(`<div class="m-head"><h3>Stoğu Sıfırla</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p>Tüm stok kalemlerinin miktarı (adet ve açık şişe cl'leri) sıfırlanacak — <b>${n}</b> kalem etkilenecek. Geliş fiyatları, kategoriler ve kalemlerin kendisi değişmez.</p>
    <p class="muted small mt8">Sıfırlama, sayfanın altındaki Stoğu Kaydet'e basılana kadar kaydedilmez; kaydedildikten sonra geri alınamaz. Önce mevcut durumun Excel çıktısını almanız önerilir.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn" onclick="exportStockExcel()">Önce Excel İndir</button>
    <button class="btn red" onclick="resetAllStock()">Sıfırla</button></div>`);
}
function resetAllStock(){
  if(user.role!=='admin') return;
  addStockOp({t:'reset'});
  closeModal(); render(); stockDraftToast('Stok sıfırlandı');
}
/* ---------- Excel (.xlsx) dışa aktarma ---------- */
/* Kasa internetsiz de çalıştığı için CDN'den kütüphane yüklemiyoruz: .xlsx
   aslında birkaç XML dosyasından oluşan bir ZIP arşivi, onu burada
   sıkıştırmasız (STORE) olarak elle üretiyoruz. Miktar/fiyat/tutarlar metin
   değil gerçek sayı hücresi olarak yazılır ki muhasebe Excel'de formül ve
   karşılaştırma yapabilsin. */
const CRC32_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC32_TABLE[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zipStore(files){
  const enc=new TextEncoder(), parts=[], central=[];
  let off=0;
  files.forEach(f=>{
    const name=enc.encode(f.name), data=enc.encode(f.text), crc=crc32(data), sz=data.length;
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true);
    lh.setUint16(12,0x21,true); /* 01.01.1980 */
    lh.setUint32(14,crc,true); lh.setUint32(18,sz,true); lh.setUint32(22,sz,true); lh.setUint16(26,name.length,true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true);
    ch.setUint16(14,0x21,true);
    ch.setUint32(16,crc,true); ch.setUint32(20,sz,true); ch.setUint32(24,sz,true); ch.setUint16(28,name.length,true);
    ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer), name);
    off+=30+name.length+sz;
  });
  const cdSize=central.reduce((a,p)=>a+p.length,0);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true);
  end.setUint32(12,cdSize,true); end.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(end.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xmlEsc(s){return String(s??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function xlsxCol(i){let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
/* sheets: [{name, widths:[...], freeze:başlık satırı no, rows:[[hücre,...],...]}]
   hücre: null | metin | sayı | {v, s, f} — s: 't' büyük başlık, 'h' tablo başlığı,
   'b' kalın, 'm' para, 'mb' kalın para, 'd' tarih (v: Excel gün sayısı, bkz.
   xlsxDate); f: formül (v önbellek değeri olarak yazılır) */
const XLSX_STYLE={t:5,h:2,b:1,m:3,mb:4,d:6};
function xlsxBlob(sheets){
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const HEAD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const cellXML=(c,ref)=>{
    if(c==null || c==='') return '';
    const o=(typeof c==='object')?c:{v:c};
    const s=o.s?` s="${XLSX_STYLE[o.s]}"`:'';
    if(o.f) return `<c r="${ref}"${s}><f>${xmlEsc(o.f)}</f>${typeof o.v==='number'&&isFinite(o.v)?`<v>${o.v}</v>`:''}</c>`;
    if(typeof o.v==='number') return isFinite(o.v)?`<c r="${ref}"${s}><v>${o.v}</v></c>`:'';
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(o.v)}</t></is></c>`;
  };
  const sheetXML=sh=>{
    const pane=sh.freeze?`<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze+1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>`:'';
    const cols=(sh.widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const rows=sh.rows.map((r,ri)=>`<row r="${ri+1}">${(r||[]).map((c,ci)=>cellXML(c,xlsxCol(ci)+(ri+1))).join('')}</row>`).join('');
    return `${HEAD}<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>${cols?`<cols>${cols}</cols>`:''}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const styles=`${HEAD}<styleSheet xmlns="${NS}">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const files=[
    {name:'[Content_Types].xml', text:`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name:'_rels/.rels', text:`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:'xl/workbook.xml', text:`${HEAD}<workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets>${sheets.map((sh,i)=>`<sheet name="${xmlEsc(String(sh.name).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels', text:`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${RNS}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${RNS}/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/styles.xml', text:styles},
    ...sheets.map((sh,i)=>({name:`xl/worksheets/sheet${i+1}.xml`, text:sheetXML(sh)}))
  ];
  return zipStore(files);
}
/* başlık + alt başlık + tablo (başlığı 4. satırda, veri 5. satırdan) ve
   sumCol verilirse altta SUM formüllü toplam satırı olan rapor sayfası */
function xlsxReportSheet({name, title, sub, head, widths, rows, sumCol, sumLabelCol, sumLabel, sum}){
  const out=[[{v:title, s:'t'}], [sub], [], head.map(h=>({v:h, s:'h'})), ...rows];
  if(sumCol!=null){
    const L=xlsxCol(sumCol), tot=new Array(sumCol+1).fill(null);
    tot[sumLabelCol!=null?sumLabelCol:sumCol-1]={v:sumLabel, s:'b'};
    tot[sumCol]=rows.length?{f:`SUM(${L}5:${L}${4+rows.length})`, v:sum, s:'mb'}:{v:0, s:'mb'};
    out.push([], tot);
  }
  return {name, widths, freeze:4, rows:out};
}
function xlsxTitle(report){return `${db.settings.businessName||'Restoranım'} — ${report}`}
function xlsxSub(extra){return (extra?extra+' · ':'')+`Çıktı: ${trDate(iso())} ${trTime(Date.now())} · Alan: ${user.name}`}
/* 'YYYY-MM-DD' → Excel tarih seri numarası (1900 sistemi) */
function xlsxDate(d){const [y,m,g]=String(d||'').split('-').map(Number);return Date.UTC(y,m-1,g)/86400000+25569}
/* tutarlar yuvarlanmadan yazılır (Excel 2 ondalık gösterir) ki toplamlar
   ekrandakiyle kuruşu kuruşuna tutsun; sadece kayan nokta kırıntısı atılır */
function xlsxNum(n,d){const k=Math.pow(10,d==null?6:d);return Math.round((n||0)*k)/k}
function downloadXlsx(sheets, filename){
  const a=document.createElement('a'); a.href=URL.createObjectURL(xlsxBlob(sheets));
  a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
/* Stok Durumu (arama filtresinden bağımsız, tüm stok): 1. sayfa kalem kalem
   düz liste (Excel'de sıralama/filtre/DÜŞEYARA ile ay başı karşılaştırması
   kolay olsun diye ara toplam satırı araya girmez), 2. sayfa kategori
   toplamları. */
function stockReportSheets(){
  const detail=[], summary=[];
  let grand=0;
  stockCatList().forEach(cat=>{
    const items=db.stock.filter(s=>s.cat===cat);
    if(!items.length) return;
    let catTotal=0;
    items.forEach(s=>{
      const val=stockLineValue(s);
      catTotal+=val;
      detail.push([cat, s.name, xlsxNum(s.qty,3), s.bottleCl?'adet':(s.unit||''),
        s.bottleCl?xlsxNum(s.extraCl,3):null, s.bottleCl?xlsxNum(stockTotalCl(s),3):null,
        {v:xlsxNum(s.price), s:'m'}, {v:xlsxNum(val), s:'m'}]);
    });
    grand+=catTotal;
    summary.push([cat, items.length, {v:xlsxNum(catTotal), s:'m'}]);
  });
  const title=xlsxTitle('Stok Durumu Raporu'), sub=xlsxSub();
  return [
    xlsxReportSheet({name:'Stok Durumu', title, sub, widths:[22,32,10,8,14,12,16,18],
      head:['Kategori','Ürün','Miktar','Birim','Açık Şişe (cl)','Toplam (cl)','Birim Fiyat (₺)','Toplam Değer (₺)'],
      rows:detail, sumCol:7, sumLabel:'Toplam Stok Değeri', sum:xlsxNum(grand)}),
    xlsxReportSheet({name:'Kategori Toplamları', title, sub, widths:[26,14,18],
      head:['Kategori','Kalem Sayısı','Toplam Değer (₺)'],
      rows:summary, sumCol:2, sumLabelCol:0, sumLabel:'Toplam Stok Değeri', sum:xlsxNum(grand)})
  ];
}
function exportStockExcel(){
  if(!db.stock.length){toast('Dışa aktarılacak stok kalemi yok','err');return}
  downloadXlsx(stockReportSheets(), 'walky_stok_durumu_'+iso()+'.xlsx');
  const n=stockDraft().length;
  if(n) toast('Excel kaydedilmiş stoğu içerir — kaydedilmemiş '+n+' değişiklik dahil değil','ok');
}
/* Genel Stok: ekranda uygulanmış tarih aralığı ve arama ile aynı içerik
   (bkz. stockGenelHTML) — 1. sayfa kalem kalem tüketim, 2. sayfa kategori
   toplamları. Eşleşen kalem yoksa null. */
function stockGenelSheets(){
  const q=(stockGenelQuery||'').toLowerCase();
  const agg=consumptionInRange(stockGenelFrom, stockGenelTo);
  const detail=[], summary=[];
  let grand=0;
  stockCatList().forEach(cat=>{
    const items=db.stock.filter(s=>s.cat===cat && (!q || s.name.toLowerCase().includes(q)));
    if(!items.length) return;
    let catTotal=0;
    items.forEach(s=>{
      const qty=agg[s.id]||0, val=consumedValue(s, qty);
      catTotal+=val;
      detail.push([cat, s.name, xlsxNum(qty,3), s.bottleCl?'cl':(s.unit||''), {v:xlsxNum(val), s:'m'}]);
    });
    grand+=catTotal;
    summary.push([cat, {v:xlsxNum(catTotal), s:'m'}]);
  });
  if(!detail.length) return null;
  const title=xlsxTitle('Genel Stok (Tüketim) Raporu');
  const sub=xlsxSub(`Tarih aralığı: ${trDate(stockGenelFrom)} – ${trDate(stockGenelTo)}${q?` · Arama: "${stockGenelQuery}"`:''}`);
  return [
    xlsxReportSheet({name:'Genel Stok', title, sub, widths:[22,32,16,8,20],
      head:['Kategori','Ürün','Tüketilen Miktar','Birim','Tüketilen Tutar (₺)'],
      rows:detail, sumCol:4, sumLabel:'Toplam Tüketilen Tutar', sum:xlsxNum(grand)}),
    xlsxReportSheet({name:'Kategori Toplamları', title, sub, widths:[26,20],
      head:['Kategori','Tüketilen Tutar (₺)'],
      rows:summary, sumCol:1, sumLabel:'Toplam Tüketilen Tutar', sum:xlsxNum(grand)})
  ];
}
function exportStockGenelExcel(){
  const sheets=stockGenelSheets();
  if(!sheets){toast('Bu aralıkta/aramada dışa aktarılacak kalem yok','err');return}
  downloadXlsx(sheets, 'walky_genel_stok_'+stockGenelFrom+'_'+stockGenelTo+'.xlsx');
}
/* Mal Girişi geçmişinin tamamı, eskiden yeniye (muhasebe defteri sırası);
   tarih gerçek Excel tarihi olarak yazılır ki sıralama/filtre çalışsın.
   2. sayfa firma bazında toplamlar. Kalem sonradan yeniden adlandırıldıysa
   güncel adı, silindiyse kayıttaki adı kullanılır (bkz. stockMalGirisiHTML). */
function malGirisiSheets(){
  const list=(db.goodsReceipts||[]).slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0));
  const bySup={};
  let grand=0;
  const rows=list.map(g=>{
    const s=db.stock.find(x=>x.id===g.stockId);
    const tot=(g.qty||0)*(g.unitPrice||0);
    grand+=tot;
    const f=bySup[g.supplier]||(bySup[g.supplier]={n:0,t:0}); f.n++; f.t+=tot;
    return [{v:xlsxDate(g.date), s:'d'}, g.supplier, s?s.cat:'', s?s.name:g.stockName, xlsxNum(g.qty,3),
      s?(s.bottleCl?'adet':(s.unit||'')):'', {v:xlsxNum(g.unitPrice), s:'m'}, {v:xlsxNum(tot), s:'m'}, g.by||''];
  });
  const sup=Object.keys(bySup).sort((a,b)=>a.localeCompare(b,'tr')).map(k=>[k, bySup[k].n, {v:xlsxNum(bySup[k].t), s:'m'}]);
  const title=xlsxTitle('Mal Girişi Raporu');
  const sub=xlsxSub(`Tarih aralığı: ${trDate(list[0].date)} – ${trDate(list[list.length-1].date)}`);
  return [
    xlsxReportSheet({name:'Mal Girişi', title, sub, widths:[12,24,20,30,10,8,16,16,16],
      head:['Tarih','Firma','Kategori','Ürün','Miktar','Birim','Birim Fiyat (₺)','Toplam (₺)','Giren'],
      rows, sumCol:7, sumLabel:'Genel Toplam', sum:xlsxNum(grand)}),
    xlsxReportSheet({name:'Firma Toplamları', title, sub, widths:[28,14,18],
      head:['Firma','Kayıt Sayısı','Toplam (₺)'],
      rows:sup, sumCol:2, sumLabelCol:0, sumLabel:'Genel Toplam', sum:xlsxNum(grand)})
  ];
}
function exportMalGirisiExcel(){
  if(!(db.goodsReceipts||[]).length){toast('Dışa aktarılacak mal girişi kaydı yok','err');return}
  downloadXlsx(malGirisiSheets(), 'walky_mal_girisi_'+iso()+'.xlsx');
}
