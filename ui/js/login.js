'use strict';
/* ============================================================
   WALKY POS — giriş ekranı
   ============================================================ */
function doLogin(){
  const u=$('#loginUser').value.trim(), p=$('#loginPass').value;
  const f=db.users.find(x=>x.username===u && x.pass===p);
  if(!f){toast('Kullanıcı adı veya şifre hatalı','err');return}
  user=f; view=defaultView(f.role); tableFilter='all'; render();
}
function defaultView(r){return r==='depo'?'stock' : r==='muhasebe'?'stats' : 'tables'}
function logout(){user=null; render()}

let loginTab = 'local';
function setLoginTab(t){ loginTab=t; render(); }
function loginHTML(){
  const local = `
    <label class="fl">Kullanıcı Adı</label>
    <input id="loginUser" class="inp" placeholder="kullanıcı adınızı girin" autocomplete="off">
    <label class="fl">Şifre</label>
    <input id="loginPass" class="inp" type="password" placeholder="••••••••">
    <button class="btn accent wide mt24" onclick="doLogin()">Giriş Yap</button>
    <div class="demo-box">
      <b>Demo hesaplar</b> (şifre: 1234)<br>
      <b>admin</b> · yönetici &nbsp;|&nbsp; <b>garson</b> · garson<br>
      <b>depo</b> · depo &nbsp;|&nbsp; <b>muhasebe</b> · muhasebe
      <div class="mt8"><button class="rowbtn" style="color:#60a5fa;font-size:12px" onclick="resetDB()">Demo verilerini sıfırla</button></div>
    </div>`;
  const remote = `
    <label class="fl">Sunucu Adresi</label>
    <input id="rmUrl" class="inp" placeholder="https://..." value="${esc((remoteSession&&remoteSession.url)||location.origin)}" autocomplete="off">
    <label class="fl">E-posta</label>
    <input id="rmMail" class="inp" inputmode="email" placeholder="patron@restoran.com" autocomplete="off">
    <label class="fl">Şifre</label>
    <input id="rmPass" class="inp" type="password" placeholder="••••••••">
    <button class="btn accent wide mt24" onclick="remoteLogin()">Canlı Panele Bağlan</button>
    <p class="muted tiny mt12">Uzaktan izleme salt-okunurdur: patron, muhasebe ve depo restorandaki durumu anlık görür, değişiklik yapamaz.</p>`;
  return `<div class="login-wrap"><div class="card login-card">
    <div class="brand"><div class="logo">${PLATE}</div><div class="nm">WALKY</div><div class="sub">Restoran Yönetim Sistemi</div></div>
    <div class="seg login-tabs">
      <button class="seg-b ${loginTab==='local'?'on':''}" onclick="setLoginTab('local')">🖥️ Kasa Girişi</button>
      <button class="seg-b ${loginTab==='remote'?'on':''}" onclick="setLoginTab('remote')">📡 Uzaktan İzleme</button>
    </div>
    ${loginTab==='local'?local:remote}
  </div></div>`;
}
