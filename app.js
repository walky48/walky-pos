'use strict';
/* ============================================================
   WALKY POS — kök render + başlatma
   Bu dosya backend (veri/durum) ile ui (ekranlar) katmanlarını
   birbirine bağlar ve uygulamayı başlatır.
   ============================================================ */
function render(){
  const app=$('#app');
  if(!user){ app.innerHTML=loginHTML(); const pi=$('#loginPass'); if(pi) pi.onkeydown=e=>{if(e.key==='Enter')doLogin()}; return; }
  if(remoteMode){ app.innerHTML=layoutHTML(); return; }
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
initSync();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
