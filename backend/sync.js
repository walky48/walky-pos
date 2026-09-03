'use strict';


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
  if(!db.expenses) db.expenses=[];
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
  /* uzaktan (telefon) bağlanan bir garson "Hesap Yazdır"/"Sipariş Gönder"
     bastığında, kendi telefonunda fiziksel yazıcı olmadığı için istek
     buraya (kasadaki gerçek yazıcıya bağlı cihaza) düşer — bkz. server.js
     printBroadcast, ui/js/print.js remotePrintRequest */
  kasaES.addEventListener('print', async e=>{
    try{
      const p = JSON.parse(e.data);
      if(!p || !Array.isArray(p.lines)) return;
      const silent = typeof printLinesSilently==='function' && await printLinesSilently(p.lines);
      if(!silent && p.html && typeof doPrint==='function') doPrint(p.html);
      if(typeof toast==='function') toast((p.kind==='kitchen'?'Uzaktan mutfak fişi':'Uzaktan hesap fişi')+(p.by?' ('+p.by+')':'')+' alındı, yazdırılıyor','ok');
    }catch(err){}
  });
}
function initSync(){
  loadSyncCfg();
  window.addEventListener('online', ()=>syncPushNow());
  setInterval(()=>{ if(syncPending()) syncPushNow(); }, 45000);
  if(syncCfg && !remoteMode){ kasaSubscribe(); if(syncPending()) syncPushNow(); }
}

/* eşleştirme (Kullanıcılar sayfasındaki panel)
   Yeni bir cihaz eşleştirildiğinde, sunucuda zaten veri varsa (başka bir
   kasa daha önce bağlanmışsa) o veri BENİMSENİR — bu cihazın kendi boş/
   varsayılan verisiyle sunucudakini ezmesi engellenir. Sunucuda hiç veri
   yoksa (ilk kurulum) bu cihazın verisi başlangıç durumu olarak gönderilir. */
async function syncPair(){
  const url = $('#syUrl').value.trim().replace(/\/+$/,''), tenant = $('#syTen').value.trim(), key = $('#syKey').value.trim();
  if(!url || !tenant || !key){ toast('Sunucu adresi, restoran kodu ve anahtar zorunlu','err'); return; }
  let health;
  try{
    health = await fetch(url + '/api/health').then(r=>r.json());
    if(!health.ok) throw new Error();
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  let cur;
  try{
    cur = await fetch(url + '/api/state?tenant=' + encodeURIComponent(tenant) + '&key=' + encodeURIComponent(key)).then(r=>r.json());
  }catch(e){ toast('Sunucuya ulaşılamadı — adresi kontrol edin','err'); return; }
  if(!cur.ok){ toast('Restoran kodu veya anahtar hatalı','err'); return; }
  syncCfg = {url, tenant, key};
  if(cur.state){
    adoptState(cur);
    toast('Sunucudaki mevcut veriler bu cihaza yüklendi ✓','ok');
  }else{
    syncLastOkRev = 0; /* sunucuda hiç veri yok — bu cihazınki ilk veri olarak gönderilir */
    saveSyncCfg();
    await syncPushNow();
    if(syncPending()){ toast('Gönderim başarısız — tekrar deneyin','err'); syncCfg=null; saveSyncCfg(); render(); return; }
  }
  kasaSubscribe();
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
let syncQueued = false; // syncBusy iken gelen yeni gönderim isteği — mevcut istek bitince hemen tekrar denenir

function loadRemoteSession(){
  try{ const r = localStorage.getItem(REMOTE_KEY); if(r) remoteSession = JSON.parse(r); }catch(e){}
}
function saveRemoteSession(){
  try{ remoteSession ? localStorage.setItem(REMOTE_KEY, JSON.stringify(remoteSession)) : localStorage.removeItem(REMOTE_KEY); }catch(e){}
}
async function remoteLogin(){
  const url = $('#rmUrl').value.trim().replace(/\/+$/,''), code = $('#rmCode').value.trim(),
        login = $('#rmUser').value.trim(), pass = $('#rmPass').value,
        remember = $('#rmRemember') ? $('#rmRemember').checked : true;
  if(!url || !login || !pass){ toast('Sunucu, kullanıcı ve şifre zorunlu','err'); return; }
  if(!login.includes('@') && !code){ toast('Personel girişi için restoran kodu gerekli','err'); return; }
  let r;
  try{
    r = await fetch(url + '/api/login', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:login, tenant:code, password:pass, remember})}).then(x=>x.json());
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
  db = statePayload.state || seedDBBlank();
  if(!db.stockLog) db.stockLog=[];
  if(!db.dayHistory) db.dayHistory=[];
  if(!db.cari) db.cari=[];
  if(!db.floatChecks) db.floatChecks=[];
  if(!db.expenses) db.expenses=[];
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
async function remotePushNow(retryCount){
  retryCount = retryCount || 0;
  if(!remoteMode || !remoteSession) return;
  if(syncBusy){
    /* aynı anda ("Sipariş Gönder" art arda basılması gibi) yeni bir gönderim
       isteği geldi — devam eden istek bitene kadar sıraya alınır, kaybolmaz */
    if(retryCount===0) syncQueued = true;
    return;
  }
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
    /* başka bir cihaz aynı anda gönderdiği için sunucu reddetti. Eskiden burada
       doğrudan sunucudaki durum benimsenirdi — bu, az önce burada tamamlanan
       işlemi (ör. masa kapatma) sessizce siler, masa "kendiliğinden yeniden
       açılmış" gibi görünürdü. Artık sadece güncel revizyonu alıp AYNI yerel
       durumu yeniden gönderiyoruz (birkaç kez, kısa aralıklarla) — büyük
       çoğunlukla bu sadece bir zamanlama çakışmasıdır ve tekrar denemede sorunsuz
       kabul edilir. Gerçekten uzlaşmaz bir çakışma nadiren birkaç denemeden
       sonra da sürerse, son çare olarak sunucudaki durum benimsenir. */
    if(retryCount < 6){
      try{
        const j = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
        if(j && j.ok) syncServerRev = j.rev;
      }catch(e){}
      setTimeout(()=>remotePushNow(retryCount+1), 300 + Math.random()*400);
    }else{
      try{
        const j = await fetch(remoteSession.url + '/api/state', {headers:{'Authorization':'Bearer '+remoteSession.token}}).then(x=>x.json());
        if(j.ok){
          adoptState(j);
          toast('Aynı anda başka bir cihaz işlem yaptı — ekran güncellendi, son işleminizi kontrol edip gerekirse tekrarlayın','err');
        }
      }catch(e){}
    }
  } else if(failed && syncPending()){
    clearTimeout(syncTimer); syncTimer = setTimeout(remotePushNow, 8000);
  }
  if(syncQueued){ syncQueued = false; remotePushNow(); }
}
/* uzaktan (telefon) oturumda "Hesap Yazdır"/"Sipariş Gönder" basıldığında
   çağrılır — bu cihazın kendi fiziksel yazıcısı yok, istek kasadaki gerçek
   yazıcıya bağlı cihaza SSE ile iletilir (bkz. kasaSubscribe 'print' listener). */
async function remotePrintRequest(kind, lines, html){
  if(!remoteSession){ if(typeof toast==='function') toast('Bağlantı yok — yazdırılamadı','err'); return; }
  const label = kind==='kitchen' ? 'Mutfak fişi' : 'Fiş';
  try{
    const r = await fetch(remoteSession.url + '/api/print', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+remoteSession.token},
      body: JSON.stringify({kind, lines, html})
    }).then(x=>x.json());
    if(!r.ok){ toast(r.error||'Yazdırma isteği gönderilemedi','err'); return; }
    if(r.delivered) toast(label+' kasadaki yazıcıya gönderildi ✓','ok');
    else toast('Kasa şu an bağlı değil — '+label.toLowerCase()+' yazdırılamadı, lütfen kasadan kontrol edin','err');
  }catch(e){ toast('İnternet yok — yazdırma isteği gönderilemedi','err'); }
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
  user = null; db = loadDB() || seedDBBlank();
  loadSyncCfg(); /* bu cihaz aynı zamanda eşleştirilmiş kasaysa sayaçlarını geri yükle */
  if(syncCfg) kasaSubscribe();
  render();
}
