'use strict';

function viewUsers(){
  const rows=db.users.map(u=>`<tr>
    <td><b>${esc(u.name)}</b></td><td class="muted" data-lbl="Kullanıcı Adı">${esc(u.username)}</td>
    <td data-lbl="Rol"><span class="badge ${u.role==='admin'?'cur':'gray'}">${ROLES[u.role]}</span></td>
    <td class="right tdact">${u.id!==user.id?`<button class="btn sm red" onclick="delUser('${u.id}')">Sil</button>`:'<span class="muted tiny">aktif oturum</span>'}</td>
  </tr>`).join('');
  return `<div class="page-head">
      <div><h1>Kullanıcılar</h1></div>
      <button class="btn accent" onclick="openAddUser()">+ Yeni Kullanıcı</button></div>
    <table class="dt"><thead><tr><th>Ad</th><th>Kullanıcı Adı</th><th>Rol</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    ${settingsPanelHTML()}
    ${syncPanelHTML()}
    ${printerPanelHTML()}`;
}
function settingsPanelHTML(){
  return `<div class="panel mt16"><div class="st" style="margin-bottom:12px">AYARLAR</div>
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:0">
      <input type="checkbox" ${db.settings.stockEnabled?'checked':''} onchange="toggleStockEnabled(this.checked)"> Stok Takibi (reçete ile otomatik düşüm, Stok Durumu sekmesi, stok uyarıları)
    </label>
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:12px">
      <input type="checkbox" ${db.settings.remoteOrderingEnabled?'checked':''} onchange="toggleRemoteOrdering(this.checked)"> Uzaktan Sipariş Girişi (garsonlar telefonla "Uzaktan Erişim" ile giriş yapıp sipariş girebilir)
    </label>
    <p class="muted tiny mt8">⚠️ Kalabalık ve zayıf internet altında birden fazla telefon aynı anda yazarsa, nadir de olsa çakışma yaşanıp bir işlemin kaybolması riski vardır. Sakin bir dönemde deneyerek açmanız önerilir.</p>
    <label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:12px">
      <input type="checkbox" ${db.settings.remoteAdminFullAccess?'checked':''} onchange="toggleRemoteAdminFullAccess(this.checked)"> Yönetici Tam Erişimi (uzaktan bağlanan yönetici hesapları salt-okunur değil, her şeyi yapabilir — fiş yazdırma dahil)
    </label>
    <p class="muted tiny mt8">⚠️ Bu, yukarıdaki garson ayarından bağımsızdır. Uzaktan bağlanan yönetici, kasadaki cihazla AYNI ANDA bir masayı düzenlerse yine nadir bir çakışma riski taşır.</p>
  </div>`;
}
function toggleStockEnabled(v){
  db.settings.stockEnabled=v;
  saveDB(); render();
  toast(v?'Stok takibi açıldı ✓':'Stok takibi kapatıldı','ok');
}
function toggleRemoteOrdering(v){
  db.settings.remoteOrderingEnabled=v;
  saveDB(); render();
  toast(v?'Uzaktan sipariş girişi açıldı ✓':'Uzaktan sipariş girişi kapatıldı','ok');
}
function toggleRemoteAdminFullAccess(v){
  db.settings.remoteAdminFullAccess=v;
  saveDB(); render();
  toast(v?'Yönetici tam erişimi açıldı ✓':'Yönetici tam erişimi kapatıldı, salt-okunura döndü','ok');
}
function printerPanelHTML(){
  const native = typeof nativePrinterAvailable==='function' && nativePrinterAvailable();
  if(native){
    return `<div class="panel mt16"><div class="st" style="margin-bottom:12px">YAZICI (USB, SESSİZ YAZDIRMA)</div>
      <div class="mini-row"><span>Durum</span><span class="v green">🟢 Native uygulama — otomatik</span></div>
      <p class="muted tiny mt8">Bu cihazda uygulamanın kendi USB yazıcı desteği aktif. "Hesap Yazdır" doğrudan bağlı yazıcıya basar; ilk yazdırmada Android bir kerelik "bu cihaza erişime izin ver" penceresi gösterebilir, izin verdikten sonra bir daha sormaz.</p>
    </div>`;
  }
  const supported = typeof printerSupported==='function' && printerSupported();
  if(!supported){
    return `<div class="panel mt16"><div class="st" style="margin-bottom:12px">YAZICI (USB, SESSİZ YAZDIRMA)</div>
      <p class="muted small">Bu cihaz/tarayıcı USB yazıcı bağlantısını desteklemiyor. "Hesap Yazdır" butonu normal yazdırma penceresini açmaya devam edecek.</p></div>`;
  }
  const connected = typeof printerConnected==='function' && printerConnected();
  const saved = typeof printerSavedInfo==='function' && printerSavedInfo();
  return `<div class="panel mt16"><div class="st" style="margin-bottom:12px">YAZICI (USB, SESSİZ YAZDIRMA)</div>
    <div class="mini-row"><span>Durum</span><span class="v ${connected?'green':(saved?'amber':'')}">${connected?'🟢 Bağlı':(saved?'🟡 Eşleşti, bağlantı bekleniyor':'⚪ Bağlı değil')}</span></div>
    <p class="muted tiny mt8">USB adisyon yazıcınızı bir kere seçin — sonrasında "Hesap Yazdır" hiçbir pencere açmadan doğrudan bu yazıcıya basar. Bağlantı kurulamazsa otomatik olarak normal yazdırma penceresine döner.</p>
    <div class="m-actions" style="justify-content:flex-start"><button class="btn accent" onclick="pairPrinter()">🖨️ Yazıcı Seç / Değiştir</button></div>
  </div>`;
}
function syncPanelHTML(){
  if(remoteMode) return '';
  const st = syncCfg
    ? `<div class="mini-row"><span>Durum</span><span class="v ${syncPending()?'amber':'green'}">${syncPending()?'🟡 Bekleyen değişiklik var':'🟢 Senkron'}</span></div>
       <div class="mini-row"><span>Sunucu</span><span class="v small">${esc(syncCfg.url)}</span></div>
       <div class="mini-row"><span>Restoran (kiracı)</span><span class="v">${esc(syncCfg.tenant)}</span></div>`
    : '';
  return `<div class="panel mt16"><div class="st" style="margin-bottom:12px">CANLI SUNUCU BAĞLANTISI (UZAKTAN İZLEME)</div>
    ${st}
    ${syncCfg
      ? `<div class="m-actions" style="justify-content:flex-start"><button class="btn red" onclick="syncUnpair()">Bağlantıyı Kes</button></div>`
      : `<label class="fl">Sunucu Adresi</label>
         <input id="syUrl" class="inp" value="${esc(location.origin.startsWith('http')?location.origin:'')}" autocomplete="off">
         <label class="fl">Restoran Kodu (kiracı)</label>
         <input id="syTen" class="inp" autocomplete="off">
         <label class="fl">Cihaz API Anahtarı</label>
         <input id="syKey" class="inp" autocomplete="off">
         <div class="m-actions" style="justify-content:flex-start"><button class="btn accent" onclick="syncPair()">Bağlan ve Doğrula</button></div>`}
  </div>`;
}
function openAddUser(){
  showModal(`<div class="m-head"><h3>Yeni Kullanıcı</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <label class="fl">Ad Soyad</label><input id="nuName" class="inp">
    <label class="fl">Kullanıcı Adı</label><input id="nuUser" class="inp">
    <label class="fl">Şifre</label><input id="nuPass" class="inp">
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
