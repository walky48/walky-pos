'use strict';
/* ============================================================
   WALKY POS — kasa açılışı (garson/admin için zorunlu)
   ============================================================ */
function kasaHTML(){
  return `<div class="login-wrap"><div class="card kasa-card">
    <div class="brand" style="margin-bottom:14px"><div class="nm" style="font-size:20px">WALKY</div></div>
    <h2 style="text-align:center">Kasa Açılışı</h2>
    <p class="muted small" style="text-align:center;margin-top:5px">${trDate(iso())} · ${esc(user.name)}</p>
    <div class="kasa-note">Güne başlamadan önce kasadaki parayı sayıp kasa fazlasını girin. Girdiğiniz tutar, dün gece bırakılan tutarla karşılaştırılacaktır.</div>
    <label class="fl">Kasadaki Tutar (Kasa Fazlası)</label>
    <input id="kfVal" class="inp" inputmode="decimal" placeholder="Kasadaki tutarı sayıp girin" autocomplete="off">
    <button class="btn accent wide mt24" onclick="openDay()">Kasayı Aç ve Güne Başla</button>
    <button class="btn ghost wide mt12" onclick="logout()">Çıkış Yap</button>
  </div></div>`;
}
function openDay(){
  const f=num($('#kfVal').value);
  if(f<0){toast('Geçerli bir tutar girin','err');return}
  const expected=db.day.lastNextFloat||0;
  const match=Math.abs(f-expected)<0.005;
  if(!match){
    showModal(`<div class="m-head"><h3>⚠️ Kasa Fazlası Uyuşmuyor</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
      <div class="mini-row"><span>Dün gece bırakılan</span><span class="v">${fmt(expected)}</span></div>
      <div class="mini-row"><span>Şimdi girilen</span><span class="v">${fmt(f)}</span></div>
      <p class="mt12">Kasa fazlası dün gece bırakılan ile aynı değil, yine de kasayı açmak istiyor musunuz?</p>
      <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
      <button class="btn accent" onclick="closeModal();finishOpenDay(${f},${expected},false)">Yine de Aç</button></div>`);
    return;
  }
  finishOpenDay(f, expected, true);
}
function finishOpenDay(f, expected, match){
  db.floatChecks.push({date:iso(), expected, actual:f, match, by:user.name, at:Date.now()});
  db.day={open:true, date:iso(), openingFloat:f, openedAt:Date.now(), openedBy:user.name, lastNextFloat:db.day.lastNextFloat||0};
  saveDB(); view=defaultView(user.role); render();
  toast(match?'Kasa açıldı, iyi çalışmalar!':'Kasa farklı tutarla açıldı — kayıt altına alındı','ok');
}
