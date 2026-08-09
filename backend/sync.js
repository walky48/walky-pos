'use strict';
/* ============================================================
   WALKY POS — senkronizasyon (kasa cihazı) + uzaktan izleme
   Kasa cihazı: her kayıttan sonra durumu sunucuya iter (offline
   ise bekletir, bağlantı gelince otomatik dener).
   Uzaktan izleme: sunucudan canlı durumu (SSE) alır, salt-okunur.
   ============================================================ */

/* ---------- kasa cihazı push ---------- */
const SYNC_KEY = 'walky_sync_v1';
let syncCfg = null;   // {url, tenant, key}
let syncTimer = null;
let syncLastOkRev = 0;
let syncBusy = false;

function loadSyncCfg(){
  try{ const r = localStorage.getItem(SYNC_KEY); if(r){ const o = JSON.parse(r); syncCfg = o.cfg||null; syncLastOkRev = o.lastOkRev||0; } }catch(e){}
}
function saveSyncCfg(){
  try{ localStorage.setItem(SYNC_KEY, JSON.stringify({cfg:syncCfg, lastOkRev:syncLastOkRev})); }catch(e){}
}
function syncPending(){ return !!(syncCfg && db && (db.rev||0) > syncLastOkRev); }

/* durum rozeti: 🟢 canlı · 🟡 bekliyor · ⚪ kapalı */
function syncBadgeHTML(){
  if(remoteMode) return '';
  if(!syncCfg) return '';
  const pend = syncPending();
  return `<span class="sync-badge ${pend?'pend':'ok'}" title="${pend?'Bekleyen değişiklik var — bağlantı gelince otomatik gönderilecek':'Sunucuyla senkron'}">${pend?'🟡':'🟢'}</span>`;
}
function updateSyncBadge(){
  document.querySelectorAll('.sync-badge-slot').forEach(el=>{ el.innerHTML = syncBadgeHTML(); });
}

/* dışarı açılan API: saveDB sonrası çağrılır */
function scheduleSyncPush(){
  if(!syncCfg || remoteMode) return;
  updateSyncBadge();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPushNow, 1500);
}
async function syncPushNow(){
  if(!syncCfg || remoteMode || syncBusy) return;
  if(!syncPending()) { updateSyncBadge(); return; }
  syncBusy = true;
  const rev = db.rev||0;
  try{
    /* personel şifreleri sunucuya gitmesin */
    const state = Object.assign({}, db, {users: db.users.map(u=>({id:u.id, username:u.username, name:u.name, role:u.role}))});
    const r = await fetch(syncCfg.url + '/api/sync', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Tenant-Id':syncCfg.tenant,'X-Api-Key':syncCfg.key},
      body: JSON.stringify({rev, state})
    });
    if(r.ok){ syncLastOkRev = rev; saveSyncCfg(); }
  }catch(e){ /* offline — bekle */ }
  syncBusy = false;
  updateSyncBadge();
  if(syncPending()) clearTimeout(syncTimer), syncTimer = setTimeout(syncPushNow, 15000);
}
function initSync(){
  loadSyncCfg();
  window.addEventListener('online', ()=>syncPushNow());
  setInterval(()=>{ if(syncPending()) syncPushNow(); }, 45000);
  if(syncPending()) syncPushNow();
}

/* eşleştirme (Kullanıcılar sayfasındaki panel) */
async function syncPair(){
  const url = $('#syUrl').value.trim().replace(/\/+$/,''), tenant = $('#syTen').value.trim(), key = $('#syKey').value.trim();
  if(!url || !tenant || !key){ toast('Sunucu adresi, kiracı kimliği ve anahtar zorunlu','err'); return; }
  try{
    const h = await fetch(url + '/api/health').then(r=>r.json());
    if(!h.ok) throw new Error();
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  syncCfg = {url, tenant, key};
  syncLastOkRev = 0; /* ilk tam gönderimi tetikle */
  saveSyncCfg();
  await syncPushNow();
  if(syncPending()){ toast('Anahtar doğrulanamadı veya gönderim başarısız','err'); syncCfg=null; saveSyncCfg(); }
  else toast('Sunucuya bağlandı — canlı yayın aktif ✓','ok');
  render();
}
function syncUnpair(){
  syncCfg = null; saveSyncCfg(); render(); toast('Sunucu bağlantısı kesildi','ok');
}

/* ---------- uzaktan izleme (salt-okunur) ---------- */
const REMOTE_KEY = 'walky_remote_v1';
let remoteMode = false;
let remoteSession = null; // {url, token, tenantName, user:{name, role, email}}
let remoteES = null;
let remoteRev = 0;

function ro(){
  if(remoteMode){ toast('Uzaktan izleme salt-okunurdur','err'); return true; }
  return false;
}
function loadRemoteSession(){
  try{ const r = localStorage.getItem(REMOTE_KEY); if(r) remoteSession = JSON.parse(r); }catch(e){}
}
function saveRemoteSession(){
  try{ remoteSession ? localStorage.setItem(REMOTE_KEY, JSON.stringify(remoteSession)) : localStorage.removeItem(REMOTE_KEY); }catch(e){}
}
async function remoteLogin(){
  const url = $('#rmUrl').value.trim().replace(/\/+$/,''), email = $('#rmMail').value.trim(), pass = $('#rmPass').value;
  if(!url || !email || !pass){ toast('Tüm alanları doldurun','err'); return; }
  let r;
  try{
    r = await fetch(url + '/api/login', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email, password:pass})}).then(x=>x.json());
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  if(!r.ok){ toast(r.error||'Giriş başarısız','err'); return; }
  remoteSession = {url, token:r.token, tenantName:r.tenantName, user:r.user};
  saveRemoteSession();
  enterRemoteMode();
}
function enterRemoteMode(){
  remoteMode = true;
  user = {id:'remote', name:remoteSession.user.name, role:remoteSession.user.role, remote:true};
  view = remoteSession.user.role==='depo' ? 'stock' : remoteSession.user.role==='muhasebe' ? 'stats' : 'stats';
  document.body.classList.add('readonly');
  remoteConnect();
  render();
}
function remoteConnect(){
  if(remoteES){ remoteES.close(); remoteES = null; }
  const esUrl = remoteSession.url + '/api/events?token=' + encodeURIComponent(remoteSession.token);
  remoteES = new EventSource(esUrl);
  remoteES.addEventListener('state', e=>{
    try{
      const p = JSON.parse(e.data);
      if(p && p.state && p.rev >= remoteRev){
        remoteRev = p.rev;
        db = p.state;
        if(!db.floatChecks) db.floatChecks = [];
        if(!db.dayHistory) db.dayHistory = [];
        if(!db.cari) db.cari = [];
        if(!$('#modalWrap').classList.contains('show')) render();
      }
    }catch(err){}
  });
  remoteES.onerror = ()=>{ /* EventSource kendi kendine yeniden bağlanır */ };
}
async function remoteResume(){
  loadRemoteSession();
  if(!remoteSession) return false;
  try{
    const r = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
    if(!r.ok) throw new Error();
    if(r.state){ db = r.state; remoteRev = r.rev; }
    else db = seedDB(); /* kasa henüz hiç veri göndermediyse boş iskelet */
    enterRemoteMode();
    return true;
  }catch(e){
    remoteSession = null; saveRemoteSession();
    return false;
  }
}
function remoteLogout(){
  if(remoteES){ remoteES.close(); remoteES = null; }
  remoteMode = false; remoteSession = null; saveRemoteSession();
  document.body.classList.remove('readonly');
  user = null; db = loadDB() || seedDB();
  render();
}
