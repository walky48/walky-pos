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

function loginHTML(){
  return `<div class="login-wrap"><div class="card login-card">
    <div class="brand"><div class="logo">${PLATE}</div><div class="nm">WALKY</div><div class="sub">Restoran Yönetim Sistemi</div></div>
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
    </div>
  </div></div>`;
}
