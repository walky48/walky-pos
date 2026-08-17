'use strict';

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
    ${tot.disc>0?`<div class="rc-row"><span>${t.complimentary?'İkram':'İndirim'}</span><span>-${fmt(tot.disc,c)}</span></div>`:''}
    ${tot.serv>0?`<div class="rc-row"><span>Servis Ücreti</span><span>+${fmt(tot.serv,c)}</span></div>`:''}
    <div class="rc-row rc-tot"><span>TOPLAM</span><span>${fmt(tot.total,c)}</span></div>
    ${c!=='TL'?`<div class="rc-row"><span>TL Karşılığı</span><span>${fmt(tot.totalTL)}</span></div>
    <div class="rc-c" style="font-size:10.5px">Kur: 1${SYM[c]} = ${fmt(r)}</div>`:''}
    ${payLbl?`<div class="rc-hr"></div><div class="rc-row"><span>Ödeme</span><span>${payLbl}</span></div>`:''}
    <div class="rc-hr"></div>
    <div class="rc-c">Bizi tercih ettiğiniz için<br>teşekkür ederiz!</div>
  </div>`;
}
/* ---------- USB yazıcı için düz metin satırları (receiptHTML/mutfak fişiyle aynı içerik) ---------- */
function receiptLines(t, tot, sale){
  const c=t.currency, r=rateOf(c);
  const payLbl = sale ? (sale.method==='nakit' ? 'Nakit ('+CUR_LABEL[sale.payCur]+')'
                    : sale.method==='kart' ? 'Kredi Kartı' : 'Cari: '+sale.cariName) : null;
  const L=[
    {text:'WALKY', align:'c', bold:true, big:true},
    {text:'Restoran Yönetim Sistemi', align:'c'},
    {text:'--------------------------------'},
    {text:'Masa: '+displayName(t)+'   '+trTime(Date.now())},
    {text:'Garson: '+(t.openedBy||'')+'   '+trDate(db.day.date||iso())},
    {text:'--------------------------------'}
  ];
  t.items.forEach(i=>{
    L.push({text:i.qty+'x '+i.name+'   '+fmt(i.qty*i.unit,c)});
    if(c!=='TL') L.push({text:fmt(i.qty*i.unit*r), align:'r'});
  });
  L.push({text:'--------------------------------'});
  L.push({text:'Ara Toplam: '+fmt(tot.sub,c)});
  if(tot.disc>0) L.push({text:(t.complimentary?'İkram':'İndirim')+': -'+fmt(tot.disc,c)});
  if(tot.serv>0) L.push({text:'Servis Ücreti: +'+fmt(tot.serv,c)});
  L.push({text:'TOPLAM: '+fmt(tot.total,c), bold:true, big:true});
  if(c!=='TL'){
    L.push({text:'TL Karşılığı: '+fmt(tot.totalTL)});
    L.push({text:'Kur: 1'+SYM[c]+' = '+fmt(r)});
  }
  if(payLbl){ L.push({text:'--------------------------------'}); L.push({text:'Ödeme: '+payLbl}); }
  L.push({text:'--------------------------------'});
  L.push({text:'Bizi tercih ettiğiniz için', align:'c'});
  L.push({text:'teşekkür ederiz!', align:'c'});
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
