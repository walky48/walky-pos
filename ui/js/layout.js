'use strict';
/* ============================================================
   WALKY POS — uygulama iskeleti: yan menü + sayfa yönlendirme
   ============================================================ */
function navItems(){
  const r=user.role, items=[];
  if(r==='garson'||r==='admin') items.push(['tables','🪑','Masa Planı']);
  if(r==='depo'||r==='admin')   items.push(['stock','📦','Stok']);
  if(r==='muhasebe'||r==='admin') items.push(['stats','📊','İstatistikler'],['cari','📒','Cari Hesaplar']);
  if(r==='admin') items.push(['menu','🍽️','Menü'],['users','👥','Kullanıcılar']);
  return items;
}
function navTo(v){view=v; render()}
function layoutHTML(){
  const items=navItems().map(([v,ic,lb])=>
    `<button class="nav-i ${view===v?'on':''}" onclick="navTo('${v}')"><span class="ic">${ic}</span>${lb}</button>`).join('');
  const gunsonu=(user.role==='garson'||user.role==='admin')
    ? `<button class="nav-i" onclick="openGunSonu()"><span class="ic">🌙</span>Gün Sonu</button>` : '';
  let content='';
  if(view==='tables') content=viewTables();
  else if(view==='stock') content=viewStock();
  else if(view==='stats') content=viewStats();
  else if(view==='cari') content=viewCari();
  else if(view==='menu') content=viewMenu();
  else if(view==='users') content=viewUsers();
  return `<div class="layout">
    <aside class="sidebar">
      <div class="sb-brand">${PLATE}<span class="nm">WALKY</span></div>
      <nav class="nav">${items}${gunsonu}</nav>
      <div class="sb-foot">
        <div class="avatar">${esc(user.name[0].toUpperCase())}</div>
        <div class="u"><div class="n">${esc(user.name)}</div><div class="r">${ROLES[user.role]}</div></div>
        <button class="icon-b" title="Çıkış" onclick="logout()">⏻</button>
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}
