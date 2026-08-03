'use strict';
/* ============================================================
   WALKY POS — global uygulama durumu (state)
   ============================================================ */
let db;
let user = null;
let view = 'tables';
let activeTableId = null;
let orderCat = 'Yiyecek';
let orderSearch = '';
let tableFilter = 'all';
let stockFilter = 'all';
let payState = null;
let statsFrom = iso(), statsTo = iso(), statsCustom = false;
let sidebarOpen = false;

function getTable(id){return db.tables.find(t=>t.id===id)}
function menuCats(){return [...new Set(db.menu.map(m=>m.cat))]}
function displayName(t){return t.customName || t.name}
