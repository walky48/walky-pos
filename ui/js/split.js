'use strict';

/* Ayrı (kalem bazlı) ödeme — ör. 10 kişilik masada herkes kendi payını ayrı öder.
   Hesaplamalar backend/logic.js'te (splitPaidMap, partTotals, billTotals), ödeme
   penceresi ve kaydı ui/js/order.js'te (payTarget, completePayment). Burada:
   ödenecek adetlerin seçimi ve alınan ödemelerin (salt okunur) listesi var.
   Alınmış bir ödeme ve kapanmış çek DEĞİŞTİRİLEMEZ: ödeme iptali, ödemeden adet
   çıkarma ve ayrı ödemeli çeki yeniden açma bilerek yok. Yanlış seçim, ödeme
   TAMAMLANMADAN önce ürünün yanındaki "−" ile (sipariş panelinde ya da ödeme
   penceresinde) düzeltilir. */

/* eski satırlarda lid olmayabilir (anahtar mid'e düşer) — ayrı ödeme anahtarı
   kalıcı olsun diye eksik olanlara verilir */
function ensureLids(t){ t.items.forEach(i=>{ if(!i.lid) i.lid=uid(); }); }

/* ---------- ödenecek adetlerin seçimi (bellekte; kaydedilmez) ---------- */
function splitSelNow(t,pm){
  if(!splitSel || splitSel.tid!==t.id) return {};
  const out={};
  t.items.forEach(i=>{ const k=lineKey(i), q=Math.min(splitSel.q[k]||0, lineLeft(i,pm)); if(q>0) out[k]=q; });
  return out;
}
function splitSelPut(tid,k,q){
  if(!splitSel || splitSel.tid!==tid) splitSel={tid, q:{}};
  if(q>0) splitSel.q[k]=q; else delete splitSel.q[k];
}
function splitAdd(lk){
  const t=getTable(activeTableId); if(!t) return;
  if(t.complimentary){toast('İkram masada ayrı ödeme alınamaz','err');return}
  const line=findLine(lk); if(!line) return;
  if(!line.lid){ ensureLids(t); saveDB(true); }
  const k=lineKey(line), pm=splitPaidMap(t), cur=splitSelNow(t,pm)[k]||0;
  if(cur>=lineLeft(line,pm)){toast('Bu üründen ödenecek adet kalmadı','err');return}
  splitSelPut(t.id,k,cur+1); renderOrderPanel();
}
function splitSub(lk){
  const t=getTable(activeTableId); if(!t) return;
  const cur=splitSelNow(t,splitPaidMap(t))[lk]||0;
  splitSelPut(t.id,lk,cur-1); renderOrderPanel();
}
function splitClear(){ splitSel=null; renderOrderPanel(); }
function startSplitPay(){
  const t=getTable(activeTableId); if(!t) return;
  const sel=splitSelNow(t,splitPaidMap(t));
  if(!Object.keys(sel).length){toast('Önce ödenecek ürünleri seçin','err');return}
  payState={method:null, payCur:t.currency, cariName:'', print:false, sel:{...sel}};
  openPaymentModal();
}
/* ödeme penceresinde bir ürünün ödenecek adedini azaltır/artırır (ör. 3 kahve
   yerine yanlışlıkla 4 seçilmişse −'ye basılır); ödeme tamamlanana kadar serbest */
function payStep(lk,d){
  const t=getTable(activeTableId); if(!t||!payState||!payState.sel) return;
  const row=splitRows(t,splitPaidMap(t)).find(r=>r.lk===lk); if(!row) return;
  const cur=Math.min(payState.sel[lk]||0,row.qty), nv=Math.max(0,Math.min(row.qty,cur+d));
  if(nv>0) payState.sel[lk]=nv; else delete payState.sel[lk];
  splitSelPut(t.id,lk,nv);
  if(!Object.keys(payState.sel).length){ payState=null; closeModal(); renderOrderPanel(); toast('Ödenecek ürün kalmadı','err'); return; }
  openPaymentModal();
}
function payCancel(){ payState=null; closeModal(); if(view==='order') renderOrderPanel(); }

/* ---------- alınan ödemeler (sipariş panelinde, salt okunur) ---------- */
function splitPaymentsHTML(t,sales){
  if(!sales.length) return '';
  const c=t.currency;
  return `<div class="osec"><div class="osec-t">Alınan Ödemeler (${sales.length})</div>${sales.map(s=>`<div class="opay">
      <div class="opay-h"><span class="muted tiny">${trTime(s.closedAt)}</span><span class="opay-m">${payLabel(s)}</span><b>${fmt(s.total,c)}</b></div>
      <div class="opay-i muted">${s.items.map(i=>fmtQ(i.qty)+'x '+esc(i.name)).join(', ')}</div>
    </div>`).join('')}</div>`;
}
/* ödenecek hiçbir şey kalmadıysa (ör. ödenmemiş adetler masadan düşürüldüyse) masayı kapatır */
function splitCloseTable(){
  const t=getTable(activeTableId); if(!t) return;
  if(splitRows(t,splitPaidMap(t)).length){toast('Masada ödenmemiş ürün var','err');return}
  resetTable(t); splitSel=null; saveDB(); view='tables'; render(); toast('Masa kapatıldı','ok');
}
