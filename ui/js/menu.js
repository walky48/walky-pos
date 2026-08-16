'use strict';

function viewMenu(){
  const cats=menuCats();
  const sections=cats.map(cat=>{
    const rows=db.menu.filter(m=>m.cat===cat).map(m=>`<tr>
      <td style="width:30%"><b>${esc(m.name)}</b><div class="muted tiny">${rcpSummary(m)}</div></td>
      <td data-lbl="TL (₺)"><input class="inp" style="max-width:150px" value="${String(m.price.TL).replace('.',',')}" onchange="setPrice('${m.id}','TL',this.value)"></td>
      <td data-lbl="Dolar ($, otomatik)"><input class="inp" style="max-width:150px" value="${String(m.price.USD).replace('.',',')}" disabled title="Euro fiyatından ve güncel kurdan otomatik hesaplanır"></td>
      <td data-lbl="Euro (€)"><input class="inp" style="max-width:150px" value="${String(m.price.EUR).replace('.',',')}" onchange="setPrice('${m.id}','EUR',this.value)"></td>
      <td class="right tdact" style="white-space:nowrap"><button class="rowbtn" onclick="prodModal('${m.id}')">Düzenle</button>&nbsp;<button class="btn sm red" onclick="askDelProduct('${m.id}')">Sil</button></td>
    </tr>`).join('');
    return `<div class="sect"><div class="st">${esc(cat)}</div>
      <table class="dt"><thead><tr><th>Ürün</th><th>TL (₺)</th><th>Dolar ($)</th><th>Euro (€)</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }).join('');
  return `<div class="page-head">
      <div><h1>Menü Yönetimi</h1><div class="sub">TL ve Euro fiyatları elle girilir; Dolar fiyatı Euro'dan ve güncel kurdan otomatik hesaplanır (her zaman yukarı yuvarlanır)</div></div>
      <button class="btn accent" onclick="prodModal('')">+ Yeni Ürün</button>
    </div>
    <div class="panel mb12" style="margin-bottom:20px">
      <div class="st" style="margin-bottom:12px">GÜNLÜK KUR (TCMB)</div>
      <div class="range-bar">
        <div class="fld"><span>1 $ = ₺</span><input id="rUsd" class="inp" style="width:130px" value="${String(db.rates.USD).replace('.',',')}"></div>
        <div class="fld"><span>1 € = ₺</span><input id="rEur" class="inp" style="width:130px" value="${String(db.rates.EUR).replace('.',',')}"></div>
        <button class="btn accent" onclick="saveRates()">Kurları Kaydet</button>
        ${db.rates.updatedAt?`<span class="muted small">Son güncelleme: ${trDT(db.rates.updatedAt)}</span>`:''}
      </div>
      <p class="muted tiny mt12">Kur yalnızca döviz masalarında TL karşılığını göstermek ve döviz nakit tahsilatını TL'ye çevirmek için kullanılır. Sistem tamamen offline çalıştığı için kur her sabah TCMB'den kontrol edilip buradan elle girilir; Electron sürümünde internet varken otomatik çekilecektir.</p>
    </div>
    ${sections}`;
}
function setPrice(mid,cur,val){
  const m=db.menu.find(x=>x.id===mid); const v=num(val);
  if(v<0){toast('Geçersiz fiyat','err');render();return}
  m.price[cur]=v;
  if(cur==='EUR') m.price.USD=usdFromEur(v,db.rates);
  saveDB(); render(); toast(m.name+' → '+fmt(v,cur),'ok');
}
function saveRates(){
  const u=num($('#rUsd').value), e=num($('#rEur').value);
  if(u<=0||e<=0){toast('Geçerli kur girin','err');return}
  db.rates.USD=u; db.rates.EUR=e; db.rates.updatedAt=Date.now();
  recalcMenuUsdPrices();
  saveDB(); render(); toast('Kurlar güncellendi, Dolar fiyatları yeniden hesaplandı ✓','ok');
}

let rcpTmp=[];
function prodModal(mid){
  const m=mid?db.menu.find(x=>x.id===mid):null;
  rcpTmp=m&&m.recipe?m.recipe.map(r=>({s:r.s,q:r.q})):[];
  const cats=menuCats();
  const catOpts=cats.map(c=>`<option value="${esc(c)}" ${m&&m.cat===c?'selected':''}>${esc(c)}</option>`).join('')
    +`<option value="__new">➕ Yeni kategori…</option>`;
  showModal(`<div class="m-head"><h3>${m?'Ürünü Düzenle':'Yeni Ürün'}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Ürün Adı</label>
    <input id="pName" class="inp" value="${m?esc(m.name):''}">
    <label class="fl">Kategori</label>
    <select id="pCat" class="inp" onchange="$('#pCatNewWrap').style.display=this.value==='__new'?'block':'none'">${catOpts}</select>
    <div id="pCatNewWrap" style="display:none">
      <label class="fl">Yeni Kategori Adı</label>
      <input id="pCatNew" class="inp">
    </div>
    <label class="fl">Fiyatlar (TL ve Euro elle girilir, Dolar Euro'dan otomatik hesaplanır)</label>
    <div class="range-bar">
      <div class="fld"><span>₺</span><input id="pTL" class="inp" style="width:110px" inputmode="decimal" value="${m?String(m.price.TL).replace('.',','):''}"></div>
      <div class="fld"><span>€</span><input id="pEUR" class="inp" style="width:110px" inputmode="decimal" value="${m?String(m.price.EUR).replace('.',','):''}" oninput="pModalUsdPreview()"></div>
      <div class="fld"><span>$</span><input id="pUSD" class="inp" style="width:110px" disabled value="${m?usdFromEur(m.price.EUR,db.rates):0}"></div>
    </div>
    <label class="fl">Reçete (stok bağlantısı — ürün satıldıkça bu malzemeler düşer)</label>
    <div id="rcpRows"></div>
    <button class="rowbtn" onclick="rcpAdd()">+ Malzeme Ekle</button>
    <p class="muted tiny mt8">${KITCHEN_CATS.map(esc).join(' ve ')} kategorisindeki ürünler mutfak fişine dahil edilir. Reçete boş bırakılırsa satışta stok düşümü yapılmaz.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="saveProduct('${mid||''}')">${m?'Kaydet':'Ürünü Ekle'}</button></div>`,true);
  renderRcpRows();
}
function renderRcpRows(){
  const box=$('#rcpRows'); if(!box) return;
  if(!rcpTmp.length){box.innerHTML='<div class="muted tiny" style="padding:6px 0">Malzeme eklenmedi.</div>';return}
  box.innerHTML=rcpTmp.map((r,i)=>{
    const opts=db.stock.map(s=>`<option value="${s.id}" ${r.s===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
    return `<div class="range-bar" style="margin-bottom:8px">
      <select class="inp" style="flex:1;min-width:160px" onchange="rcpChgS(${i},this.value)">${opts}</select>
      <input class="inp" style="width:90px" inputmode="decimal" value="${String(r.q).replace('.',',')}" oninput="rcpChgQ(${i},this.value)">
      <span class="muted small" style="min-width:40px">${esc(stockUnit(r.s))}</span>
      <button class="icon-b" onclick="rcpDel(${i})">✕</button>
    </div>`;
  }).join('');
}
function pModalUsdPreview(){
  const el=$('#pUSD'); if(!el) return;
  el.value=usdFromEur(num($('#pEUR').value),db.rates);
}
function rcpAdd(){rcpTmp.push({s:db.stock[0].id,q:1});renderRcpRows()}
function rcpChgS(i,v){rcpTmp[i].s=v;renderRcpRows()}
function rcpChgQ(i,v){rcpTmp[i].q=num(v)}
function rcpDel(i){rcpTmp.splice(i,1);renderRcpRows()}
function saveProduct(mid){
  const name=$('#pName').value.trim();
  if(!name){toast('Ürün adı girin','err');return}
  let cat=$('#pCat').value;
  if(cat==='__new'){cat=$('#pCatNew').value.trim();if(!cat){toast('Yeni kategori adı girin','err');return}}
  const tl=num($('#pTL').value), eur=num($('#pEUR').value);
  if(tl<=0){toast('TL fiyatı zorunludur','err');return}
  if(eur<0){toast('Geçersiz fiyat','err');return}
  const usd=usdFromEur(eur,db.rates);
  const recipe=rcpTmp.filter(r=>r.s&&r.q>0).map(r=>({s:r.s,q:r.q}));
  if(mid){
    const m=db.menu.find(x=>x.id===mid);
    m.name=name; m.cat=cat; m.price={TL:tl,USD:usd,EUR:eur}; m.recipe=recipe;
  }else{
    db.menu.push({id:uid(), name, cat, price:{TL:tl,USD:usd,EUR:eur}, recipe});
  }
  saveDB(); closeModal(); render();
  toast(mid?'Ürün güncellendi ✓':name+' menüye eklendi ✓','ok');
}
function askDelProduct(mid){
  const m=db.menu.find(x=>x.id===mid); if(!m) return;
  if(db.tables.some(t=>t.items.some(i=>i.mid===mid))){toast('Bu ürün şu an açık bir masada — önce hesabı kapatın','err');return}
  showModal(`<div class="m-head"><h3>Ürünü Sil</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p><b>${esc(m.name)}</b> menüden kalıcı olarak silinecek. Geçmiş satış kayıtları etkilenmez.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="delProduct('${mid}')">Evet, Sil</button></div>`);
}
function delProduct(mid){
  db.menu=db.menu.filter(m=>m.id!==mid);
  saveDB(); closeModal(); render(); toast('Ürün silindi','ok');
}
