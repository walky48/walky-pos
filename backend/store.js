'use strict';
/* ============================================================
   WALKY POS — kalıcı depolama (localStorage; yoksa bellek)
   ============================================================ */
let memStore = null;
function loadDB(){ try{const r=localStorage.getItem(DB_KEY); if(r) return JSON.parse(r);}catch(e){} return memStore; }
function saveDB(){
  db.rev=(db.rev||0)+1;
  if(typeof remoteMode!=='undefined' && remoteMode){
    /* uzak istemci: yerel diske yazmaz, değişikliği sunucuya gönderir */
    if(typeof scheduleRemotePush==='function') scheduleRemotePush();
    return;
  }
  try{localStorage.setItem(DB_KEY, JSON.stringify(db));}catch(e){ memStore = db; }
  if(typeof scheduleSyncPush==='function') scheduleSyncPush();
}
function resetDB(){ try{localStorage.removeItem(DB_KEY);}catch(e){} memStore=null; db=seedDB(); saveDB(); user=null; render(); toast('Demo verileri sıfırlandı','ok'); }
