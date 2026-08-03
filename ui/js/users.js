'use strict';
/* ============================================================
   WALKY POS — kullanıcılar (yalnızca admin)
   ============================================================ */
function viewUsers(){
  const rows=db.users.map(u=>`<tr>
    <td><b>${esc(u.name)}</b></td><td class="muted" data-lbl="Kullanıcı Adı">${esc(u.username)}</td>
    <td data-lbl="Rol"><span class="badge ${u.role==='admin'?'cur':'gray'}">${ROLES[u.role]}</span></td>
    <td class="right tdact">${u.id!==user.id?`<button class="btn sm red" onclick="delUser('${u.id}')">Sil</button>`:'<span class="muted tiny">aktif oturum</span>'}</td>
  </tr>`).join('');
  return `<div class="page-head">
      <div><h1>Kullanıcılar</h1><div class="sub">Personel hesapları ve rolleri</div></div>
      <button class="btn accent" onclick="openAddUser()">+ Yeni Kullanıcı</button></div>
    <table class="dt"><thead><tr><th>Ad</th><th>Kullanıcı Adı</th><th>Rol</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function openAddUser(){
  showModal(`<div class="m-head"><h3>Yeni Kullanıcı</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Ad Soyad</label><input id="nuName" class="inp" placeholder="örn. Mehmet Yılmaz">
    <label class="fl">Kullanıcı Adı</label><input id="nuUser" class="inp" placeholder="örn. mehmet">
    <label class="fl">Şifre</label><input id="nuPass" class="inp" placeholder="şifre">
    <label class="fl">Rol</label>
    <div class="seg" id="nuSeg">
      <button class="seg-b on" data-t="garson" onclick="segSel(this)">Garson</button>
      <button class="seg-b" data-t="depo" onclick="segSel(this)">Depo</button>
      <button class="seg-b" data-t="muhasebe" onclick="segSel(this)">Muhasebe</button>
      <button class="seg-b" data-t="admin" onclick="segSel(this)">Yönetici</button>
    </div>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="addUser()">Oluştur</button></div>`);
}
function addUser(){
  const name=$('#nuName').value.trim(), un=$('#nuUser').value.trim(), pw=$('#nuPass').value;
  if(!name||!un||!pw){toast('Tüm alanları doldurun','err');return}
  if(db.users.some(u=>u.username===un)){toast('Bu kullanıcı adı zaten var','err');return}
  const role=document.querySelector('#nuSeg .on').dataset.t;
  db.users.push({id:uid(), username:un, pass:pw, name, role});
  saveDB(); closeModal(); render(); toast('Kullanıcı oluşturuldu ✓','ok');
}
function delUser(id){
  db.users=db.users.filter(u=>u.id!==id);
  saveDB(); render(); toast('Kullanıcı silindi','ok');
}
