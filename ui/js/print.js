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
function receiptHTML(t, tot, sale){
  const c=t.currency;
  const {totalTL, totalEUR, totalUSD} = receiptTotals3(t, tot);
  const lines=t.items.map(i=>`<div class="rc-row"><span>${i.qty}x ${esc(i.name)}</span><span>${fmt(i.qty*i.unit,c)}</span></div>`).join('');
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
    <div class="rc-row"><span>Ara Toplam</span><span>${fmt(tot.sub,c)}</span></div>
    ${tot.disc>0?`<div class="rc-row"><span>${t.complimentary?'İkram':'İndirim'}</span><span>-${fmt(tot.disc,c)}</span></div>`:''}
    ${tot.serv>0?`<div class="rc-row"><span>Servis Ücreti</span><span>+${fmt(tot.serv,c)}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-row rc-tot"><span>TOPLAM (TL)</span><span>${fmt(totalTL,'TL')}</span></div>
    <div class="rc-row rc-tot"><span>TOPLAM (EUR)</span><span>${fmt(totalEUR,'EUR')}</span></div>
    <div class="rc-row rc-tot"><span>TOPLAM (USD)</span><span>${fmt(totalUSD,'USD')}</span></div>
    ${payLbl?`<div class="rc-hr"></div><div class="rc-row"><span>Ödeme</span><span>${payLbl}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-c">Afiyet olsun<br>Yine bekleriz!</div>
    <div class="rc-foot-brand">WALKY<br>Restoran Yönetim Sistemi</div>
  </div>`;
}
/* ---------- USB yazıcı için düz metin satırları (receiptHTML/mutfak fişiyle aynı içerik) ---------- */
const RC_COLS = 42; // termal kağıttaki karakter genişliği — sığmıyorsa/boşluk fazlaysa bu sayıyı değiştir
function padLine(left, right, width){
  width = width || RC_COLS;
  const gap = width - left.length - right.length;
  return gap>0 ? left+' '.repeat(gap)+right : left+' '+right;
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
    L.push({text: padLine(i.qty+'x '+i.name, fmt(i.qty*i.unit,c))});
  });
  L.push({text:'--------------------------------'});
  L.push({text: padLine('Ara Toplam', fmt(tot.sub,c))});
  if(tot.disc>0) L.push({text: padLine(t.complimentary?'İkram':'İndirim', '-'+fmt(tot.disc,c))});
  if(tot.serv>0) L.push({text: padLine('Servis Ücreti', '+'+fmt(tot.serv,c))});
  L.push({text:'--------------------------------'});
  L.push({text: padLine('TOPLAM (TL)', fmt(totalTL,'TL')), bold:true});
  L.push({text: padLine('TOPLAM (EUR)', fmt(totalEUR,'EUR')), bold:true});
  L.push({text: padLine('TOPLAM (USD)', fmt(totalUSD,'USD')), bold:true});
  if(payLbl){ L.push({text:'--------------------------------'}); L.push({text: padLine('Ödeme', payLbl)}); }
  L.push({text:'--------------------------------'});
  L.push({text:'Afiyet olsun', align:'c'});
  L.push({text:'Yine bekleriz!', align:'c'});
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
