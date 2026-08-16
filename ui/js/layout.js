'use strict';

function navItems(){
  const r=user.role, items=[];
  if(r==='garson'||r==='admin') items.push(['tables','🪑','Masa Planı']);
  if(r==='depo'||r==='admin')   items.push(['stock','📦','Stok']);
  if(r==='muhasebe'||r==='admin') items.push(['stats','📊','İstatistikler'],['cari','📒','Cari Hesaplar']);
  if(r==='admin') items.push(['menu','🍽️','Menü'],['users','👥','Kullanıcılar']);
  return items;
}
function navTo(v){view=v; sidebarOpen=false; render()}
function toggleSidebar(open){ sidebarOpen=open; render() }
function layoutHTML(){
  const items=navItems().map(([v,ic,lb])=>
    `<button class="nav-i ${view===v?'on':''}" onclick="navTo('${v}')"><span class="ic">${ic}</span>${lb}</button>`).join('');
  const gunsonu=(user.role==='garson'||user.role==='admin')
    ? `<button class="nav-i" onclick="sidebarOpen=false;openGunSonu()"><span class="ic">🌙</span>Gün Sonu</button>` : '';
  const roleLbl = remoteMode
    ? (remoteSession.user.role==='patron'?'Patron':ROLES[user.role]) + ' · Uzak'
    : ROLES[user.role];
  const liveTag = remoteMode ? `<span class="live-tag">● CANLI</span>` : `<span class="sync-badge-slot">${syncBadgeHTML()}</span>`;
  let content='';
  if(view==='tables') content=viewTables();
  else if(view==='stock') content=viewStock();
  else if(view==='stats') content=viewStats();
  else if(view==='cari') content=viewCari();
  else if(view==='menu') content=viewMenu();
  else if(view==='users') content=viewUsers();
  return `<div class="layout">
    <div class="mtopbar">
      <button class="icon-b" style="font-size:19px" onclick="toggleSidebar(true)">☰</button>
      <span class="mtopbar-nm">${PLATE}<span class="nm">WALKY</span></span>
      <span style="flex:1"></span>${liveTag}
    </div>
    <div class="sb-overlay ${sidebarOpen?'show':''}" onclick="toggleSidebar(false)"></div>
    <aside class="sidebar ${sidebarOpen?'open':''}">
      <div class="sb-brand">${PLATE}<span class="nm">WALKY</span>${remoteMode?`<span class="live-tag">● CANLI</span>`:`<span class="sync-badge-slot">${syncBadgeHTML()}</span>`}<button class="icon-b sb-close" onclick="toggleSidebar(false)">✕</button></div>
      ${remoteMode?`<div class="tenant-line">${esc(remoteSession.tenantName)}</div>`:''}
      <nav class="nav">${items}${gunsonu}</nav>
      <div class="sb-foot">
        <div class="avatar">${esc(user.name[0].toUpperCase())}</div>
        <div class="u"><div class="n">${esc(user.name)}</div><div class="r">${roleLbl}</div></div>
        <button class="icon-b" title="Çıkış" onclick="${remoteMode?'remoteLogout()':'logout()'}">⏻</button>
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}
