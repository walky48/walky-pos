'use strict';

let memStore = null;
function loadDB(){ try{const r=localStorage.getItem(DB_KEY); if(r) return JSON.parse(r);}catch(e){} return memStore; }
function saveDB(){
  db.rev=(db.rev||0)+1;
  if(typeof remoteMode!=='undefined' && remoteMode){
    
    if(typeof scheduleRemotePush==='function') scheduleRemotePush();
    return;
  }
  try{localStorage.setItem(DB_KEY, JSON.stringify(db));}catch(e){ memStore = db; }
  if(typeof scheduleSyncPush==='function') scheduleSyncPush();
}
