'use strict';

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
if(!db.menuRealSeeded){
  db.menu=seedDB().menu;
  db.menuRealSeeded=true;
}
// alkol stokları test amaçlı dolduruldu (cl'ler 1000, biralar 100 adet) — tek seferlik
if(!db.stockAlkolSeeded){
  db.stock=seedDB().stock;
  db.stockAlkolSeeded=true;
}
// depoda artık sadece alkol kalemleri tutuluyor — eski demo yiyecek/içecek stokları kaldırıldı, tek seferlik
if(!db.stockNonAlkolRemoved){
  db.stock=db.stock.filter(s=>s.cat==='Alkol');
  db.stockNonAlkolRemoved=true;
}
// Dolar fiyatları artık Euro fiyatından ve güncel kurdan otomatik hesaplanıyor — mevcut menüye bir kerelik uygulanır
if(!db.usdFromEurApplied){
  recalcMenuUsdPrices();
  db.usdFromEurApplied=true;
}

if(!db.tables25Seeded){
  if(db.tables.every(t=>t.status==='empty')) db.tables=seedDB().tables;
  db.tables25Seeded=true;
}
// gerçek personel hesapları tanımlandı (isim/şifre güncellemeleri + garsonlar) — tek seferlik
if(!db.usersRealSeeded){
  const byUser=un=>db.users.find(u=>u.username===un);
  const admin=byUser('admin'); if(admin){ admin.name='Bahar'; admin.pass='7811'; }
  const depo=byUser('depo'); if(depo){ depo.pass='2207'; }
  const muhasebe=byUser('muhasebe'); if(muhasebe){ muhasebe.name='Funda'; muhasebe.pass='4823'; }
  db.users=db.users.filter(u=>u.username!=='garson');
  [['kadir','Kadir'],['muhammed','Muhammed'],['fevzi','Fevzi'],['ugur','Uğur']].forEach(([un,name])=>{
    if(!byUser(un)) db.users.push({id:uid(), username:un, pass:'1234', name, role:'garson'});
  });
  db.usersRealSeeded=true;
}
// admin girişi kullanıcı adı da isme uydu — tek seferlik
if(!db.adminUsernameRenamed){
  const admin=db.users.find(u=>u.username==='admin');
  if(admin) admin.username='bahar';
  db.adminUsernameRenamed=true;
}
// test verileri temizlendi (satışlar, gün sonu geçmişi, kasa kontrolleri, cari, stok miktarları) — menüye dokunulmadı, tek seferlik
if(!db.testDataCleared){
  db.sales=[]; db.dayHistory=[]; db.floatChecks=[]; db.cari=[]; db.stockLog=[];
  db.stock.forEach(s=>{ s.qty=0; });
  db.testDataCleared=true;
}
initSync();
if(typeof tryReconnectPrinter==='function') tryReconnectPrinter();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
