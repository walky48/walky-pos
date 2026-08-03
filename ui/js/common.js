'use strict';
/* ============================================================
   WALKY POS — ortak arayüz yardımcıları: toast, modal, segment
   ============================================================ */
function toast(msg,type){
  const w=$('#toastWrap'); const el=document.createElement('div');
  el.className='toast '+(type||''); el.textContent=msg; w.appendChild(el);
  setTimeout(()=>{el.classList.add('out'); setTimeout(()=>el.remove(),320)},2600);
}
function showModal(html,wide){
  const b=$('#modalBox'); b.className='modal-box'+(wide?' wide':''); b.innerHTML=html;
  $('#modalWrap').classList.add('show');
}
function closeModal(){$('#modalWrap').classList.remove('show')}
function segSel(el){ el.parentElement.querySelectorAll('.seg-b').forEach(b=>b.classList.remove('on')); el.classList.add('on'); }
