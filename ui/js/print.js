'use strict';
/* ============================================================
   WALKY POS — yazdırma (müşteri fişi + mutfak fişi)
   ============================================================ */
function doPrint(html){
  const pa=$('#printArea'); pa.innerHTML=html;
  window.print();
  setTimeout(()=>{pa.innerHTML=''},800);
}
function receiptHTML(t, tot, sale){
  const c=t.currency, r=rateOf(c);
  const lines=t.items.map(i=>`<div class="rc-row"><span>${i.qty}x ${esc(i.name)}</span><span>${fmt(i.qty*i.unit,c)}</span></div>
    ${c!=='TL'?`<div class="rc-sub">${fmt(i.qty*i.unit*r)}</div>`:''}`).join('');
  const payLbl = sale ? (sale.method==='nakit' ? 'Nakit ('+CUR_LABEL[sale.payCur]+')'
                    : sale.method==='kart' ? 'Kredi Kartı' : 'Cari: '+esc(sale.cariName)) : null;
  return `<div class="rc">
    <div class="rc-brand">WALKY</div>
    <div class="rc-c">Restoran Yönetim Sistemi</div>
    <div class="rc-hr"></div>
    <div class="rc-row"><span>Masa: ${esc(displayName(t))}</span><span>${trTime(Date.now())}</span></div>
    <div class="rc-row"><span>Garson: ${esc(t.openedBy||'')}</span><span>${trDate(db.day.date||iso())}</span></div>
    <div class="rc-hr"></div>
    ${lines}
    <div class="rc-hr"></div>
    <div class="rc-row"><span>Ara Toplam</span><span>${fmt(tot.sub,c)}</span></div>
    ${tot.disc>0?`<div class="rc-row"><span>İndirim</span><span>-${fmt(tot.disc,c)}</span></div>`:''}
    ${tot.serv>0?`<div class="rc-row"><span>Servis Ücreti</span><span>+${fmt(tot.serv,c)}</span></div>`:''}
    <div class="rc-row rc-tot"><span>TOPLAM</span><span>${fmt(tot.total,c)}</span></div>
    ${c!=='TL'?`<div class="rc-row"><span>TL Karşılığı</span><span>${fmt(tot.totalTL)}</span></div>
    <div class="rc-c" style="font-size:10.5px">Kur: 1${SYM[c]} = ${fmt(r)}</div>`:''}
    ${payLbl?`<div class="rc-hr"></div><div class="rc-row"><span>Ödeme</span><span>${payLbl}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-c">Bizi tercih ettiğiniz için<br>teşekkür ederiz!</div>
  </div>`;
}
function printReceipt(sale){
  const t=getTable(activeTableId);
  if(!t||!t.items.length){toast('Yazdırılacak ürün yok','err');return}
  doPrint(receiptHTML(t, calcTotals(t), sale&&sale.id?sale:null));
}
function printKitchen(){
  const t=getTable(activeTableId);
  const pend=t.items.filter(i=>KITCHEN_CATS.includes(i.cat)&&i.qty>i.sent).map(i=>({name:i.name,q:i.qty-i.sent}));
  if(!pend.length){toast('Mutfağa gönderilecek yeni ürün yok','err');return}
  const rows=pend.map(p=>`<div class="rc-k-item">${p.q}x ${esc(p.name)}</div>`).join('');
  doPrint(`<div class="rc">
    <div class="rc-big">*** MUTFAK ***</div>
    <div class="rc-hr"></div>
    <div class="rc-row"><span>Masa: ${esc(displayName(t))}</span><span>${trTime(Date.now())}</span></div>
    <div class="rc-row"><span>Garson: ${esc(t.openedBy||'')}</span><span></span></div>
    <div class="rc-hr"></div>
    ${rows}
    <div class="rc-hr"></div>
  </div>`);
  t.items.forEach(i=>{if(KITCHEN_CATS.includes(i.cat)) i.sent=i.qty});
  saveDB(); renderOrderPanel(); toast('Mutfak fişi yazdırıldı','ok');
}
