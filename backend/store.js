'use strict';
/* ============================================================
   WALKY POS — kalıcı depolama (localStorage; yoksa bellek)
   ============================================================ */
let memStore = null;
function loadDB(){ try{const r=localStorage.getItem(DB_KEY); if(r) return JSON.parse(r);}catch(e){} return memStore; }
function saveDB(){ try{localStorage.setItem(DB_KEY, JSON.stringify(db)); return;}catch(e){} memStore = db; }
function resetDB(){ try{localStorage.removeItem(DB_KEY);}catch(e){} memStore=null; db=seedDB(); saveDB(); user=null; render(); toast('Demo verileri sıfırlandı','ok'); }
