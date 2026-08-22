'use strict';

function doPrint(html){
  const pa=$('#printArea'); pa.innerHTML=html;
  window.print();
  setTimeout(()=>{pa.innerHTML=''},800);
}
function receiptTotals3(t, tot){
  const c=t.currency;
  const totalTL  = tot.totalTL;
  const totalEUR = c==='EUR' ? tot.total : totalTL/(db.rates.EUR||1);
  const totalUSD = c==='USD' ? tot.total : totalTL/(db.rates.USD||1);
  return {totalTL, totalEUR, totalUSD};
}
/* fişte fiyat gösterimi: önce sayı, sonra 2 boşluk, sonra para birimi
   (₺ yerine yazıcı uyumluluğu için "TL" metni; € gerçek sembol olarak
   basılır — bkz. backend/printer.js encodeReceiptText/EURO_BYTE) */
const PRN_SUFFIX = {TL:'TL', EUR:'€', USD:'$'};
function fmtPrn(n, cur){
  const num = Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  return num+'  '+PRN_SUFFIX[cur||'TL'];
}
function receiptHTML(t, tot, sale){
  const c=t.currency;
  const {totalTL, totalEUR, totalUSD} = receiptTotals3(t, tot);
  const lines=t.items.map(i=>`<div class="rc-row"><span>${i.qty}x ${esc(i.name)}</span><span>${fmtPrn(i.qty*i.unit,c)}</span></div>`).join('');
  const payLbl = sale ? (sale.method==='nakit' ? 'Nakit ('+CUR_LABEL[sale.payCur]+')'
                    : sale.method==='kart' ? 'Kredi Kartı' : 'Cari: '+esc(sale.cariName)) : null;
  return `<div class="rc">
    <div class="rc-brand">Azumare Lounge</div>
    <div class="rc-hr"></div>
    <div class="rc-row"><span>Masa: ${esc(displayName(t))}</span><span>${trTime(Date.now())}</span></div>
    <div class="rc-row"><span>Garson: ${esc(t.openedBy||'')}</span><span>${trDate(db.day.date||iso())}</span></div>
    <div class="rc-row"><span></span><span>${CUR_LABEL[c]}</span></div>
    <div class="rc-hr"></div>
    ${lines}
    <div class="rc-hr"></div>
    <div class="rc-row"><span>Ara Toplam</span><span>${fmtPrn(tot.sub,c)}</span></div>
    ${tot.disc>0?`<div class="rc-row"><span>${t.complimentary?'İkram':'İndirim'}</span><span>-${fmtPrn(tot.disc,c)}</span></div>`:''}
    ${tot.serv>0?`<div class="rc-row"><span>Servis Ücreti</span><span>+${fmtPrn(tot.serv,c)}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-row rc-tot"><span>TOPLAM (TL)</span><span>${fmtPrn(totalTL,'TL')}</span></div>
    <div class="rc-row rc-tot"><span>TOPLAM (EUR)</span><span>${fmtPrn(totalEUR,'EUR')}</span></div>
    <div class="rc-row rc-tot"><span>TOPLAM (USD)</span><span>${fmtPrn(totalUSD,'USD')}</span></div>
    ${payLbl?`<div class="rc-hr"></div><div class="rc-row"><span>Ödeme</span><span>${payLbl}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-c">Afiyet olsun<br>Yine bekleriz!<br>Hope to see you again</div>
    <div class="rc-foot-brand">WALKY<br>Restoran Yönetim Sistemi</div>
  </div>`;
}
/* ---------- USB yazıcı için düz metin satırları (receiptHTML/mutfak fişiyle aynı içerik) ---------- */
const RC_COLS = 42; // termal kağıttaki karakter genişliği — sığmıyorsa/boşluk fazlaysa bu sayıyı değiştir
function padLine(left, right, width){
  width = width || RC_COLS;
  // ₺ gibi simgeler yazıcıda "TL" olarak basıldığı için (bkz.
  // backend/printer.js printLen) hizalama .length değil gerçek basılı
  // genişliğe göre hesaplanmalı — aksi halde fiyat satırları kayar
  const plen = s => typeof printLen==='function' ? printLen(s) : s.length;
  const rlen = plen(right);
  // çok uzun ürün adları (menüde 35+ karakterlik isimler var) fiyatı bir
  // alt satıra kaydırmasın diye gerekirse kısaltılır — asla taşma olmasın
  let out = left;
  if(plen(out) + rlen + 1 > width) out = out.slice(0, Math.max(0, width - rlen - 1));
  const gap = width - plen(out) - rlen;
  return gap>0 ? out+' '.repeat(gap)+right : out+' '+right;
}
function receiptLines(t, tot, sale){
  const c=t.currency;
  const {totalTL, totalEUR, totalUSD} = receiptTotals3(t, tot);
  const payLbl = sale ? (sale.method==='nakit' ? 'Nakit ('+CUR_LABEL[sale.payCur]+')'
                    : sale.method==='kart' ? 'Kredi Kartı' : 'Cari: '+sale.cariName) : null;
  const L=[
    {text:'Azumare Lounge', align:'c', bold:true, big:true},
    {text:'--------------------------------'},
    {text:'Masa: '+displayName(t)+'   '+trTime(Date.now())},
    {text:'Garson: '+(t.openedBy||'')+'   '+trDate(db.day.date||iso())},
    {text:CUR_LABEL[c], align:'r'},
    {text:'--------------------------------'}
  ];
  t.items.forEach(i=>{
    L.push({text: padLine(i.qty+'x '+i.name, fmtPrn(i.qty*i.unit,c))});
  });
  L.push({text:'--------------------------------'});
  L.push({text: padLine('Ara Toplam', fmtPrn(tot.sub,c))});
  if(tot.disc>0) L.push({text: padLine(t.complimentary?'İkram':'İndirim', '-'+fmtPrn(tot.disc,c))});
  if(tot.serv>0) L.push({text: padLine('Servis Ücreti', '+'+fmtPrn(tot.serv,c))});
  L.push({text:'--------------------------------'});
  L.push({text: padLine('TOPLAM (TL)', fmtPrn(totalTL,'TL')), bold:true});
  L.push({text: padLine('TOPLAM (EUR)', fmtPrn(totalEUR,'EUR')), bold:true});
  L.push({text: padLine('TOPLAM (USD)', fmtPrn(totalUSD,'USD')), bold:true});
  if(payLbl){ L.push({text:'--------------------------------'}); L.push({text: padLine('Ödeme', payLbl)}); }
  L.push({text:'--------------------------------'});
  L.push({text:'Afiyet olsun', align:'c'});
  L.push({text:'Yine bekleriz!', align:'c'});
  L.push({text:'Hope to see you again', align:'c'});
  L.push({text:'', align:'c'});
  L.push({text:'WALKY', align:'c', small:true});
  L.push({text:'Restoran Yönetim Sistemi', align:'c', small:true});
  return L;
}
function kitchenLines(t, pend){
  const L=[
    {text:'*** MUTFAK ***', align:'c', bold:true, big:true},
    {text:'--------------------------------'},
    {text:'Masa: '+displayName(t)+'   '+trTime(Date.now())},
    {text:'Garson: '+(t.openedBy||'')},
    {text:'--------------------------------'}
  ];
  pend.forEach(p=>L.push({text:p.q+'x '+p.name, bold:true}));
  L.push({text:'--------------------------------'});
  return L;
}

async function printReceipt(sale){
  const t=getTable(activeTableId);
  if(!t||!t.items.length){toast('Yazdırılacak ürün yok','err');return}
  const tot=calcTotals(t), s=sale&&sale.id?sale:null;
  const silent = typeof printLinesSilently==='function' && await printLinesSilently(receiptLines(t, tot, s));
  if(!silent) doPrint(receiptHTML(t, tot, s));
}
async function printKitchen(){
  const t=getTable(activeTableId);
  const pend=t.items.filter(i=>KITCHEN_CATS.includes(i.cat)&&i.qty>i.sent).map(i=>({name:i.name,q:i.qty-i.sent}));
  if(!pend.length){toast('Mutfağa gönderilecek yeni ürün yok','err');return}
  const silent = typeof printLinesSilently==='function' && await printLinesSilently(kitchenLines(t, pend));
  if(!silent){
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
  }
  t.items.forEach(i=>{if(KITCHEN_CATS.includes(i.cat)) i.sent=i.qty});
  saveDB(); renderOrderPanel(); toast(silent?'Mutfak fişi yazıcıya gönderildi ✓':'Mutfak fişi yazdırıldı','ok');
}
