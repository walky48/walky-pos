'use strict';

let db;
let user = null;
let view = 'tables';
let activeTableId = null;
let orderCat = 'Yiyecek';
let orderSubCat = null; // Yemekler/Alkollü İçecekler gibi gruplanmış üst kategori içindeki alt filtre
let orderSearch = '';
let tableFilter = 'all';
let stockFilter = 'all';
let payState = null;
let statsFrom = iso(), statsTo = iso(), statsCustom = false;
let zHistoryExpanded = false, floatHistoryExpanded = false; // Z raporu / kasa açılış geçmişi varsayılan son 3 kayıt
let gidFrom = weekStartISO(), gidTo = iso(), gidCustom = false;
let sidebarOpen = false;
let peekMode = false; // admin: kasa açılmadan sadece görüntüleme (istatistik vb.)

function getTable(id){return db.tables.find(t=>t.id===id)}
function menuCats(){return [...new Set(db.menu.map(m=>m.cat))]}
/* Menü Yönetimi'nde ürün eklemeden önce de kategori oluşturulabilsin diye
   ayrıca saklanan kategori adları + fiilen üründe kullanılanların birleşimi.
   Sipariş ekranındaki üst kategori sekmeleri (orderTopCats) kasıtlı olarak
   sadece gerçek ürünü olan kategorileri kullanmaya devam eder (boş sekme açılmasın). */
function menuCatList(){return [...new Set([...db.menuCatList, ...db.menu.map(m=>m.cat)])]}
function displayName(t){return t.customName || t.name}
