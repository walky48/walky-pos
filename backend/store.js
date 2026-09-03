'use strict';

let memStore = null;
function loadDB(){ try{const r=localStorage.getItem(DB_KEY); if(r) return JSON.parse(r);}catch(e){} return memStore; }
/* skipRemotePush: uzak (telefon) oturumda tek tek ürün ekleme/çıkarma gibi
   hızlı ardışık işlemler ağa hemen gönderilmesin diye kullanılır — değişiklik
   yerelde (bellekte) birikir, "Sipariş Gönder" basılınca tek seferde
   gönderilir. Bkz. ui/js/print.js sendOrder(). Kasada bu parametrenin etkisi
   yoktur (kasada çakışma riski olmadığı için her zaman anında gönderilir). */
function saveDB(skipRemotePush){
  db.rev=(db.rev||0)+1;
  if(typeof remoteMode!=='undefined' && remoteMode){
    if(!skipRemotePush && typeof scheduleRemotePush==='function') scheduleRemotePush();
    return;
  }
  try{localStorage.setItem(DB_KEY, JSON.stringify(db));}catch(e){ memStore = db; }
  if(typeof scheduleSyncPush==='function') scheduleSyncPush();
}
