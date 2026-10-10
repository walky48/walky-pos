'use strict';

/* Ayrı (kalem bazlı) ödeme — ör. 10 kişilik masada herkes kendi payını ayrı öder.
   Hesaplamalar backend/logic.js'te (splitPaidMap, partTotals, billTotals), ödeme
   penceresi ve kaydı ui/js/order.js'te (payTarget, completePayment). Burada:
   ödenecek adetlerin seçimi ve alınan ödemelerin (salt okunur) listesi var.
   Alınmış bir ödeme DEĞİŞTİRİLEMEZ: ödeme iptali ve ödemeden adet çıkarma bilerek
   yok. Yanlış seçim, ödeme TAMAMLANMADAN önce ürünün yanındaki "−" ile (sipariş
   panelinde ya da ödeme penceresinde) düzeltilir. Ayrı ödemeli masa her şey
   ödenince KENDİLİĞİNDEN KAPANMAZ (adisyon basılabilsin diye) — splitCloseTable ile
   elle kapatılır; kapanmış çek istatistikten yeniden açılabilir (reopenSplitTo):
   ödemeler olduğu gibi kalır, yalnızca masa açık haline döner. */

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

/* ---------- kapanmış ayrı ödemeli çeki yeniden açma (bkz. ui/js/stats.js) ----------
   chk: mergeSplitSales çıktısı (parts = çekin ödemeleri). Ödemelerin hiçbiri
   silinmez/değişmez: masa, ödemeleriyle birlikte (hepsi ödenmiş olarak) kapanmadan
   önceki haline açılır; yeni eklenen ürünler ödenmemiş olarak görünür. Stok tekrar
   düşülmez (sipariş girilirken zaten düşülmüştü). */
function reopenSplitTo(chk,dst){
  const parts=splitParts(chk.splitId), first=parts[0];
  if(!parts.length) return;
  if(db.tables.some(x=>x.status==='open' && x.splitId===chk.splitId)){toast('Bu masa zaten açık','err');return}
  if(!parts.every(p=>p.bd===db.day.date)){toast('Yalnızca bugünün çekleri yeniden açılabilir','err');return}
  const lines=new Map();
  parts.forEach(p=>(p.items||[]).forEach(i=>{
    const k=i.lk||uid();
    if(!lines.has(k)) lines.set(k,{lid:k, mid:null, name:i.name, cat:i.cat||'Diğer', qty:0, unit:i.unit, sent:0, variant:null, recipe:[]});
    const l=lines.get(k); l.qty+=i.qty; l.sent=l.qty;
  }));
  dst.status='open';
  dst.customName=(first.table!==first.origTable)?first.table:null;
  dst.currency=first.currency; dst.openedAt=first.openedAt; dst.openedBy=first.waiter;
  dst.items=[...lines.values()];
  const same=k=>parts.every(p=>JSON.stringify(p[k])===JSON.stringify(first[k]));
  const discSum=parts.reduce((a,p)=>a+(p.disc||0),0), servSum=parts.reduce((a,p)=>a+(p.serv||0),0);
  dst.complimentary=parts.every(p=>p.complimentary) ? {name:first.complimentary.name, by:first.complimentary.by} : null;
  dst.discount=(same('discount') && first.discount && first.discount.type==='pct') ? {...first.discount} : (discSum>0 ? {type:'amt', value:discSum} : null);
  dst.service=(same('service') && first.service && first.service.type==='pct') ? {...first.service} : (servSum>0 ? {type:'amt', value:servSum} : null);
  dst.couvert=first.couvert?{...first.couvert}:null;
  dst.checkNo=first.checkNo||null;
  dst.splitId=chk.splitId;
  splitSel=null;
  saveDB(); closeModal(); render();
  toast('Çek yeniden açıldı: '+dst.name+' ('+parts.length+' ödemesiyle)','ok');
}
