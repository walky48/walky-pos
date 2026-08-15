'use strict';
/* ============================================================
   WALKY POS — kök render + başlatma
   Bu dosya backend (veri/durum) ile ui (ekranlar) katmanlarını
   birbirine bağlar ve uygulamayı başlatır.
   ============================================================ */
function render(){
  const app=$('#app');
  if(!user){
    app.innerHTML=loginHTML();
    const pi=$('#loginPass'); if(pi) pi.onkeydown=e=>{if(e.key==='Enter')doLogin()};
    const pr=$('#rmPass'); if(pr) pr.onkeydown=e=>{if(e.key==='Enter')remoteLogin()};
    return;
  }
  if((user.role==='garson'||user.role==='admin') && !db.day.open){ app.innerHTML=kasaHTML(); return; }
  if(view==='order' && activeTableId){ app.innerHTML=orderHTML(); return; }
  app.innerHTML=layoutHTML();
}

/* ---------- başlatma ---------- */
db = loadDB() || seedDB();
// eski kayıtlarda eksik alan kalmasın
if(!db.stockLog) db.stockLog=[];
if(!db.dayHistory) db.dayHistory=[];
if(!db.cari) db.cari=[];
if(!db.floatChecks) db.floatChecks=[];
// menü restoranın gerçek listesiyle değiştirildi — tek seferlik, açık siparişler kendi ürün adı/fiyatını zaten sipariş satırında sakladığı için etkilenmez
if(!db.menuRealSeeded){
  db.menu=seedDB().menu;
  db.menuRealSeeded=true;
}
// alkol stokları test amaçlı dolduruldu (cl'ler 1000, biralar 100 adet) — tek seferlik
if(!db.stockAlkolSeeded){
  db.stock=seedDB().stock;
  db.stockAlkolSeeded=true;
}
// masa planı restoranın gerçek düzenine göre güncellendi (25 masa) — eski test masalarıyla çakışmasın diye tek seferlik, sadece hiçbir masa açık değilse uygulanır
if(!db.tables25Seeded){
  if(db.tables.every(t=>t.status==='empty')) db.tables=seedDB().tables;
  db.tables25Seeded=true;
}
initSync();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
