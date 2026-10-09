'use strict';

/* Ayrı (kalem bazlı) ödeme — ör. 10 kişilik masada herkes kendi payını ayrı öder.
   Hesaplamalar backend/logic.js'te (splitPaidMap, partTotals, billTotals), ödeme
   penceresi ve kaydı ui/js/order.js'te (payTarget, completePayment). Burada:
   ödenecek adetlerin seçimi, alınan ödemelerin listesi, ödemeyi iptal etme /
   ödemeden 1 adet çıkarma ve kapanmış ayrı ödemeli çeki yeniden açma var. */

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
  payState={method:null, payCur:t.currency, cariName:'', print:false, sel};
  openPaymentModal();
}

/* ---------- alınan ödemeler (sipariş panelinde) ---------- */
function splitPaymentsHTML(t,sales){
  if(!sales.length) return '';
  const c=t.currency;
  return `<div class="osec"><div class="osec-t">Alınan Ödemeler (${sales.length})</div>${sales.map(s=>`<div class="opay">
      <div class="opay-h"><span class="muted tiny">${trTime(s.closedAt)}</span><span class="opay-m">${payLabel(s)}</span><b>${fmt(s.total,c)}</b>
        <button class="rowbtn" style="color:var(--red)" onclick="splitCancelAsk('${s.id}')">İptal</button></div>
      <div class="opay-i">${s.items.map(i=>`<span class="pchip">${fmtQ(i.qty)}x ${esc(i.name)}<button title="1 adedi çıkar" onclick="splitPayUnit('${s.id}','${i.lk}')">−</button></span>`).join('')}</div>
    </div>`).join('')}</div>`;
}
function splitFind(id){
  const t=getTable(activeTableId); if(!t||!t.splitId) return null;
  const s=db.sales.find(x=>x.id===id && x.splitId===t.splitId);
  return s?{t,s}:null;
}
/* para geri alındığı için iptaller ve düzeltmeler kimin ne zaman yaptığıyla kaydedilir */
function splitLog(kind, s, items, total, totalTL){
  if(!db.payCancels) db.payCancels=[];
  db.payCancels.push({ts:Date.now(), by:user.name, kind, table:s.table, checkNo:s.checkNo, bd:s.bd, method:s.method,
    cariName:s.cariName||null, currency:s.currency, total, totalTL, items});
}
function splitDropCari(s){
  if(s.method!=='cari' || !s.cariName) return;
  const acc=db.cari.find(x=>x.name.toLowerCase()===s.cariName.toLowerCase());
  if(acc) acc.entries=acc.entries.filter(e=>e.saleId!==s.id);
}
function splitCancelAsk(id){
  const f=splitFind(id); if(!f) return; const {t,s}=f;
  const what=s.items.map(i=>fmtQ(i.qty)+'x '+esc(i.name)).join(', ');
  showModal(`<div class="m-head"><h3>Ödemeyi İptal Et</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <p><b>${fmt(s.total,t.currency)}</b> (${payLabel(s)}) tutarındaki ödeme iptal edilecek. ${what} tekrar ödenmemiş duruma döner${s.method==='cari'?'; cari kaydı da silinir':''}.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn red" onclick="splitCancel('${id}')">Ödemeyi İptal Et</button></div>`);
}
function splitCancel(id){
  const f=splitFind(id); if(!f) return; const {t,s}=f;
  splitLog('Ödeme iptal', s, s.items.map(i=>({name:i.name, qty:i.qty, unit:i.unit})), s.total, s.totalTL);
  splitDropCari(s);
  db.sales.splice(db.sales.indexOf(s),1);
  if(!splitSales(t).length) t.splitId=null;
  saveDB(); closeModal(); render(); toast('Ödeme iptal edildi','ok');
}
/* alınmış bir ödemeden 1 adet çıkarır (ör. 3 kahve yerine yanlışlıkla 4 seçilmişse):
   o adet tekrar ödenmemiş olur, ödemenin tutarı (indirim/servis payı dahil)
   orantılı küçülür; cari ödemeyse cari kaydı da güncellenir */
function splitPayUnit(id,lk){
  const f=splitFind(id); if(!f) return; const {s}=f;
  const it=s.items.find(i=>i.lk===lk); if(!it) return;
  if(s.items.reduce((a,i)=>a+i.qty,0)<=1){ splitCancelAsk(id); return; }
  const oldSub=s.sub, oldTotal=s.total, oldTL=s.totalTL;
  it.qty--; if(it.qty<=0) s.items=s.items.filter(i=>i!==it);
  const sub=s.items.reduce((a,i)=>a+i.qty*i.unit,0), k=oldSub>0?sub/oldSub:0;
  s.sub=sub; s.disc=s.disc*k; s.serv=s.serv*k;
  s.total=Math.max(0,sub-s.disc+s.serv); s.totalTL=s.total*s.rate;
  if(s.discount && s.discount.type==='amt') s.discount={type:'amt', value:s.disc};
  if(s.method==='cari' && s.cariName){
    const acc=db.cari.find(x=>x.name.toLowerCase()===s.cariName.toLowerCase());
    const e=acc && acc.entries.find(x=>x.saleId===s.id); if(e) e.amtTL=s.totalTL;
  }
  splitLog('Ödemeden 1 adet çıkarıldı', s, [{name:it.name, qty:1, unit:it.unit}], oldTotal-s.total, oldTL-s.totalTL);
  saveDB(); render();
}
/* her şeyin ödendiği (ör. kapanmış çek yeniden açılınca) masayı kapatır */
function splitCloseTable(){
  const t=getTable(activeTableId); if(!t) return;
  if(splitRows(t,splitPaidMap(t)).length){toast('Masada ödenmemiş ürün var','err');return}
  resetTable(t); splitSel=null; saveDB(); view='tables'; render(); toast('Masa kapatıldı','ok');
}

/* ---------- kapanmış ayrı ödemeli çeki yeniden açma (bkz. ui/js/stats.js) ----------
   Çekin bütün ödemeleri satış kayıtlarında KALIR; masa, ödemeleriyle birlikte
   (hepsi ödenmiş olarak) açılır. Oradan ödemeler tek tek iptal edilebilir ya da
   masa yeniden kapatılabilir. */
function reopenSplitTo(s,dst){
  const parts=db.sales.filter(x=>x.splitId===s.splitId).sort((a,b)=>a.closedAt-b.closedAt), first=parts[0];
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
  const sameDisc=parts.every(p=>JSON.stringify(p.discount)===JSON.stringify(first.discount));
  const discSum=parts.reduce((a,p)=>a+(p.disc||0),0), servSum=parts.reduce((a,p)=>a+(p.serv||0),0);
  dst.complimentary=parts.every(p=>p.complimentary) ? {name:first.complimentary.name, by:first.complimentary.by} : null;
  dst.discount=(sameDisc && first.discount && first.discount.type==='pct') ? {...first.discount} : (discSum>0 ? {type:'amt', value:discSum} : null);
  dst.service=servSum>0 ? {type:'amt', value:servSum} : null;
  dst.couvert=first.couvert?{...first.couvert}:null;
  dst.checkNo=first.checkNo||null;
  dst.splitId=s.splitId;
  splitSel=null;
  saveDB(); closeModal(); render();
  toast('Çek yeniden açıldı: '+dst.name+' ('+parts.length+' ödemesiyle)','ok');
}
