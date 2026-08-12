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
// alkol takibi (kadeh/kokteyl = KADEH_CL) — eski kayıtlara tek seferlik eklenir
if(!db.alkolSeeded){
  const sd=seedDB();
  sd.stock.filter(s=>['s17','s18','s19','s20','s21'].includes(s.id))
    .forEach(s=>{ if(!db.stock.some(x=>x.id===s.id)) db.stock.push(s); });
  sd.menu.filter(m=>['m18','m19','m20','m21','m22'].includes(m.id))
    .forEach(m=>{ if(!db.menu.some(x=>x.id===m.id)) db.menu.push(m); });
  db.alkolSeeded=true;
}
initSync();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
