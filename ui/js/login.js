'use strict';

function doLogin(){
  const u=$('#loginUser').value.trim(), p=$('#loginPass').value;
  const f=db.users.find(x=>x.username===u && x.pass===p);
  if(!f){toast('Kullanıcı adı veya şifre hatalı','err');return}
  user=f; view=defaultView(f.role); tableFilter='all'; peekMode=false; render();
}
function defaultView(r){return r==='depo'?(STOCK_ENABLED?'stock':'expenses') : r==='muhasebe'?'stats' : 'tables'}
function logout(){user=null; peekMode=false; render()}

let loginTab = 'local';
function setLoginTab(t){ loginTab=t; render(); }
function loginHTML(){
  const local = `
    <label class="fl">Kullanıcı Adı</label>
    <input id="loginUser" class="inp" autocomplete="off">
    <label class="fl">Şifre</label>
    <input id="loginPass" class="inp" type="password">
    <button class="btn accent wide mt24" onclick="doLogin()">Giriş Yap</button>`;
  const remoteDisabled = typeof REMOTE_ACCESS_ENABLED!=='undefined' && !REMOTE_ACCESS_ENABLED;
  const remote = remoteDisabled ? `
    <div class="kasa-note" style="margin-top:14px">${esc(REMOTE_DISABLED_MSG)}</div>
    <p class="muted small mt12">Lütfen "🖥️ Kasa Girişi" sekmesinden, restorandaki kasa cihazından giriş yapın.</p>` : `
    <label class="fl">Sunucu Adresi</label>
    <input id="rmUrl" class="inp" value="${esc((remoteSession&&remoteSession.url)||location.origin)}" autocomplete="off">
    <label class="fl">Restoran Kodu</label>
    <input id="rmCode" class="inp" autocomplete="off">
    <label class="fl">Kullanıcı Adı veya E-posta</label>
    <input id="rmUser" class="inp" autocomplete="off">
    <label class="fl">Şifre</label>
    <input id="rmPass" class="inp" type="password">
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="rmRemember" checked> Bilgilerimi Kaydet
    </label>
    <button class="btn accent wide mt24" onclick="remoteLogin()">Sisteme Bağlan</button>`;
  return `<div class="login-wrap"><div class="card login-card">
    <div class="brand"><div class="logo">${PLATE}</div><div class="nm">WALKY</div><div class="sub">Restoran Yönetim Sistemi</div></div>
    <div class="seg login-tabs">
      <button class="seg-b ${loginTab==='local'?'on':''}" onclick="setLoginTab('local')">🖥️ Kasa Girişi</button>
      <button class="seg-b ${loginTab==='remote'?'on':''}" onclick="setLoginTab('remote')">📡 Uzaktan Erişim</button>
    </div>
    ${loginTab==='local'?local:remote}
  </div></div>`;
}
