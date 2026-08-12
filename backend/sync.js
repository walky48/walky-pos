'use strict';
/* ============================================================
   WALKY POS — senkronizasyon (çok-yazarlı)
   KASA: offline-first cihaz. Her kayıttan sonra durumu sunucuya
   iter (kasa her zaman kazanır — internet kesintisi sırasında
   restorandaki gerçek durum kasadadır), diğer cihazların
   değişikliklerini SSE ile alıp yerel veritabanına işler.
   UZAK İSTEMCİLER (garson telefonu, patron, muhasebe, depo):
   internet varken TAM ERİŞİM. Değişiklikler CAS ile sunucuya
   yazılır: aynı anda başka cihaz yazdıysa sunucu 409 döner,
   istemci güncel durumu alıp kullanıcıyı uyarır.
   ============================================================ */

/* ---------- ortak sayaçlar ---------- */
const SYNC_KEY = 'walky_sync_v1';
let syncCfg = null;       // kasa eşleştirmesi {url, tenant, key}
let syncServerRev = 0;    // yerel db'nin temel aldığı sunucu revizyonu
let syncLastOkRev = 0;    // son başarılı gönderimdeki yerel db.rev
let syncTimer = null;
let syncBusy = false;
let kasaES = null;

function loadSyncCfg(){
  try{ const r = localStorage.getItem(SYNC_KEY); if(r){ const o = JSON.parse(r); syncCfg = o.cfg||null; syncLastOkRev = o.lastOkRev||0; syncServerRev = o.serverRev||0; } }catch(e){}
}
function saveSyncCfg(){
  if(remoteMode) return; /* uzak oturum, kasanın kalıcı sayaçlarını ezmesin */
  try{ localStorage.setItem(SYNC_KEY, JSON.stringify({cfg:syncCfg, lastOkRev:syncLastOkRev, serverRev:syncServerRev})); }catch(e){}
}
function syncPending(){ return !!((remoteMode ? remoteSession : syncCfg) && db && (db.rev||0) > syncLastOkRev); }

/* durum rozeti (kasa): 🟢 senkron · 🟡 bekleyen değişiklik */
function syncBadgeHTML(){
  if(remoteMode || !syncCfg) return '';
  const pend = syncPending();
  return `<span class="sync-badge ${pend?'pend':'ok'}" title="${pend?'Bekleyen değişiklik var — bağlantı gelince otomatik gönderilecek':'Sunucuyla senkron'}">${pend?'🟡':'🟢'}</span>`;
}
function updateSyncBadge(){
  document.querySelectorAll('.sync-badge-slot').forEach(el=>{ el.innerHTML = syncBadgeHTML(); });
}

/* ---------- gelen durumu benimseme (SSE / çakışma sonrası) ---------- */
function adoptState(payload){
  if(!payload || !payload.state) return;
  db = payload.state;
  if(!db.stockLog) db.stockLog=[];
  if(!db.dayHistory) db.dayHistory=[];
  if(!db.cari) db.cari=[];
  if(!db.floatChecks) db.floatChecks=[];
  syncServerRev = payload.rev;
  syncLastOkRev = db.rev||0;
  if(!remoteMode){
    try{ localStorage.setItem(DB_KEY, JSON.stringify(db)); }catch(e){}
    saveSyncCfg();
  }
  /* başka cihaz bu masayı kapattıysa sipariş ekranında asılı kalma */
  if(view==='order' && activeTableId){
    const t = getTable(activeTableId);
    if(!t || t.status!=='open'){ view='tables'; activeTableId=null; }
  }
  updateSyncBadge();
  if(!$('#modalWrap').classList.contains('show')) render();
}

/* ---------- KASA: push + SSE ---------- */
function scheduleSyncPush(){
  if(!syncCfg) return;
  updateSyncBadge();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPushNow, 1200);
}
async function syncPushNow(){
  if(remoteMode){ remotePushNow(); return; }
  if(!syncCfg || syncBusy) return;
  if(!syncPending()){ updateSyncBadge(); return; }
  syncBusy = true;
  const rev = db.rev||0;
  try{
    const r = await fetch(syncCfg.url + '/api/sync', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Tenant-Id':syncCfg.tenant,'X-Api-Key':syncCfg.key},
      body: JSON.stringify({baseRev:syncServerRev, state:db})
    });
    if(r.ok){ const j = await r.json(); syncLastOkRev = rev; if(j.rev) syncServerRev = j.rev; saveSyncCfg(); }
  }catch(e){ /* offline — bekle */ }
  syncBusy = false;
  updateSyncBadge();
  if(syncPending()){ clearTimeout(syncTimer); syncTimer = setTimeout(syncPushNow, 15000); }
}
function kasaSubscribe(){
  if(kasaES){ kasaES.close(); kasaES = null; }
  if(!syncCfg || remoteMode) return;
  kasaES = new EventSource(syncCfg.url + '/api/events?tenant=' + encodeURIComponent(syncCfg.tenant) + '&key=' + encodeURIComponent(syncCfg.key));
  kasaES.addEventListener('state', e=>{
    try{
      const p = JSON.parse(e.data);
      /* bekleyen yerel değişiklik varken benimseme — kasa kendi durumunu itecek */
      if(p && p.rev > syncServerRev && !syncPending()) adoptState(p);
    }catch(err){}
  });
}
function initSync(){
  loadSyncCfg();
  window.addEventListener('online', ()=>syncPushNow());
  setInterval(()=>{ if(syncPending()) syncPushNow(); }, 45000);
  if(syncCfg && !remoteMode){ kasaSubscribe(); if(syncPending()) syncPushNow(); }
}

/* eşleştirme (Kullanıcılar sayfasındaki panel) */
async function syncPair(){
  const url = $('#syUrl').value.trim().replace(/\/+$/,''), tenant = $('#syTen').value.trim(), key = $('#syKey').value.trim();
  if(!url || !tenant || !key){ toast('Sunucu adresi, restoran kodu ve anahtar zorunlu','err'); return; }
  try{
    const h = await fetch(url + '/api/health').then(r=>r.json());
    if(!h.ok) throw new Error();
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  syncCfg = {url, tenant, key};
  syncLastOkRev = 0; /* ilk tam gönderimi tetikle */
  saveSyncCfg();
  await syncPushNow();
  if(syncPending()){ toast('Anahtar doğrulanamadı veya gönderim başarısız','err'); syncCfg=null; saveSyncCfg(); }
  else{ kasaSubscribe(); toast('Sunucuya bağlandı — canlı yayın aktif ✓','ok'); }
  render();
}
function syncUnpair(){
  if(kasaES){ kasaES.close(); kasaES = null; }
  syncCfg = null; saveSyncCfg(); render(); toast('Sunucu bağlantısı kesildi','ok');
}

/* ---------- UZAK İSTEMCİ (tam erişim, internet gerektirir) ---------- */
const REMOTE_KEY = 'walky_remote_v1';
let remoteMode = false;
let remoteSession = null; // {url, token, tenantName, user:{name, role, email}}
let remoteES = null;
let remoteOfflineWarned = false;

function loadRemoteSession(){
  try{ const r = localStorage.getItem(REMOTE_KEY); if(r) remoteSession = JSON.parse(r); }catch(e){}
}
function saveRemoteSession(){
  try{ remoteSession ? localStorage.setItem(REMOTE_KEY, JSON.stringify(remoteSession)) : localStorage.removeItem(REMOTE_KEY); }catch(e){}
}
async function remoteLogin(){
  const url = $('#rmUrl').value.trim().replace(/\/+$/,''), code = $('#rmCode').value.trim(),
        login = $('#rmUser').value.trim(), pass = $('#rmPass').value;
  if(!url || !login || !pass){ toast('Sunucu, kullanıcı ve şifre zorunlu','err'); return; }
  if(!login.includes('@') && !code){ toast('Personel girişi için restoran kodu gerekli','err'); return; }
  let r;
  try{
    r = await fetch(url + '/api/login', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:login, tenant:code, password:pass})}).then(x=>x.json());
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  if(!r.ok){ toast(r.error||'Giriş başarısız','err'); return; }
  remoteSession = {url, token:r.token, tenantName:r.tenantName, user:r.user};
  saveRemoteSession();
  await remoteFetchAndEnter();
}
async function remoteFetchAndEnter(){
  try{
    const j = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
    if(!j.ok) throw new Error();
    enterRemoteMode(j);
    return true;
  }catch(e){
    remoteSession = null; saveRemoteSession();
    toast('Bağlantı kurulamadı','err');
    return false;
  }
}
function enterRemoteMode(statePayload){
  remoteMode = true;
  db = statePayload.state || seedDB();
  if(!db.stockLog) db.stockLog=[];
  if(!db.dayHistory) db.dayHistory=[];
  if(!db.cari) db.cari=[];
  if(!db.floatChecks) db.floatChecks=[];
  syncServerRev = statePayload.rev||0;
  syncLastOkRev = db.rev||0;
  /* patron = uygulama içinde yönetici yetkisi */
  const uiRole = remoteSession.user.role==='patron' ? 'admin' : remoteSession.user.role;
  user = {id:'remote', name:remoteSession.user.name, role:uiRole, remote:true};
  view = defaultView(uiRole);
  remoteConnect();
  render();
}
function remoteConnect(){
  if(remoteES){ remoteES.close(); remoteES = null; }
  remoteES = new EventSource(remoteSession.url + '/api/events?token=' + encodeURIComponent(remoteSession.token));
  remoteES.addEventListener('state', e=>{
    try{
      const p = JSON.parse(e.data);
      if(p && p.rev > syncServerRev && !syncPending()) adoptState(p);
    }catch(err){}
  });
}
function scheduleRemotePush(){
  clearTimeout(syncTimer);
  syncTimer = setTimeout(remotePushNow, 500);
}
async function remotePushNow(){
  if(!remoteMode || !remoteSession || syncBusy) return;
  if(!syncPending()) return;
  syncBusy = true;
  const rev = db.rev||0;
  let conflict = false, failed = false;
  try{
    const r = await fetch(remoteSession.url + '/api/push', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+remoteSession.token},
      body: JSON.stringify({baseRev:syncServerRev, state:db})
    });
    if(r.status === 409) conflict = true;
    else if(r.status === 401){ syncBusy=false; toast('Oturum süresi doldu — yeniden giriş yapın','err'); remoteLogout(); return; }
    else if(r.ok){ const j = await r.json(); syncServerRev = j.rev; syncLastOkRev = rev; remoteOfflineWarned = false; }
    else failed = true;
  }catch(e){
    failed = true;
    if(!remoteOfflineWarned){ remoteOfflineWarned = true; toast('İnternet yok — işlem gönderilemedi, bağlantı gelince otomatik denenecek','err'); }
  }
  syncBusy = false;
  if(conflict){
    try{
      const j = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
      if(j.ok){
        adoptState(j);
        toast('Aynı anda başka bir cihaz işlem yaptı — ekran güncellendi, son işleminizi kontrol edip gerekirse tekrarlayın','err');
      }
    }catch(e){}
  } else if(failed && syncPending()){
    clearTimeout(syncTimer); syncTimer = setTimeout(remotePushNow, 8000);
  }
}
async function remoteResume(){
  loadRemoteSession();
  if(!remoteSession) return false;
  try{
    const j = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
    if(!j.ok) throw new Error();
    enterRemoteMode(j);
    return true;
  }catch(e){
    remoteSession = null; saveRemoteSession();
    return false;
  }
}
function remoteLogout(){
  if(remoteES){ remoteES.close(); remoteES = null; }
  remoteMode = false; remoteSession = null; saveRemoteSession();
  user = null; db = loadDB() || seedDB();
  loadSyncCfg(); /* bu cihaz aynı zamanda eşleştirilmiş kasaysa sayaçlarını geri yükle */
  if(syncCfg) kasaSubscribe();
  render();
}
