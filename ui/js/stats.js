'use strict';

function statCard(val,lbl,cls,sub){
  return `<div class="stat"><div>
    <div class="sv ${cls||''}">${val}</div><div class="sl">${lbl}</div>${sub?`<div class="ss">${sub}</div>`:''}</div></div>`;
}
function miniRows(st){
  return `<div class="mini-row"><span>Toplam Ciro</span><span class="v accent">${fmt(st.ciro)}</span></div>
    <div class="mini-row"><span>Nakit (TL)</span><span class="v green">${fmt(st.nakitTL)}</span></div>
    <div class="mini-row"><span>Nakit (Döviz)</span><span class="v green">${fmt(st.nakitDvTL)}${(st.dvUSD||st.dvEUR)?` <span class="muted tiny">${st.dvUSD?fmt(st.dvUSD,'USD'):''} ${st.dvEUR?fmt(st.dvEUR,'EUR'):''}</span>`:''}</span></div>
    <div class="mini-row"><span>Kredi Kartı</span><span class="v blue">${fmt(st.kart)}</span></div>
    <div class="mini-row"><span>Cari (Veresiye)</span><span class="v purple">${fmt(st.cari)}</span></div>
    <div class="mini-row"><span>Masa Sayısı</span><span class="v">${st.count}</span></div>
    <div class="mini-row"><span>Misafir Sayısı</span><span class="v">${st.guestK+st.guestE+st.guestC} <span class="muted tiny">(K:${st.guestK} · E:${st.guestE} · Ç:${st.guestC})</span></span></div>`;
}
function guestStatCard(st){
  return statCard(st.guestK+st.guestE+st.guestC, 'Misafir Sayısı', '', `K:${st.guestK} · E:${st.guestE} · Ç:${st.guestC}`);
}
/* sales: groupChecks() çıktısı — ayrı ödemeyle alınan masa tek çek olarak gelir */
function checkIsOpen(c){ return !!c.splitId && db.tables.some(x=>x.status==='open' && x.splitId===c.splitId); }
function checkReopenable(c){
  return user.role==='admin' && !remoteViewOnly() && !checkIsOpen(c) && (c.parts ? c.parts.every(p=>p.bd===db.day.date) : c.bd===db.day.date);
}
function ordersRowsHTML(sales){
  return sales.slice().reverse().map(s=>`<tr>
      <td>${trDate(s.bd)}</td><td data-lbl="Çek No">#${fmtCheckNo(s.checkNo)}</td><td data-lbl="Masa"><b>${esc(s.table)}</b>${s.parts&&s.parts.length>1?` <span class="badge gray">${s.parts.length} ödeme</span>`:''}${checkIsOpen(s)?' <span class="badge ok">masa açık</span>':''}</td><td class="muted" data-lbl="Garson">${esc(s.waiter||'')}</td>
      <td data-lbl="Açılış">${trTime(s.openedAt)}</td><td data-lbl="Kapanış">${checkIsOpen(s)?'-':trTime(s.closedAt)}</td>
      <td class="num" data-lbl="Tutar">${fmt(s.totalTL)}</td><td data-lbl="Ödeme">${checkPayLabel(s)}</td>
      <td class="right tdact"><button class="rowbtn" onclick="orderDetail('${s.id}')">Detay</button>
        ${checkReopenable(s)?`<button class="rowbtn" style="color:var(--red);margin-left:8px" onclick="reopenSaleAsk('${s.id}')">Yeniden Aç</button>`:''}</td></tr>`).join('');
}
function viewStats(){
  const today=db.day.open?db.day.date:iso();
  const st=computeStats(today,today);
  const stW=computeStats(weekStartISO(),iso());
  const stM=computeStats(monthStartISO(),iso());
  const listF=statsCustom?statsFrom:today, listT=statsCustom?statsTo:today;
  const stR=computeStats(listF,listT);
  const orders=ordersRowsHTML(groupChecks(stR.sales));
  const zList=zHistoryExpanded?db.dayHistory:db.dayHistory.slice(-3);
  const zRows=zList.slice().reverse().map(z=>`<tr>
      <td>${trDate(z.date)}</td><td class="num" data-lbl="Ciro">${fmt(z.ciro)}</td><td data-lbl="Yemek">${fmt(z.yemekTL||0)}</td><td data-lbl="Nakit">${fmt(z.nakitTL+z.nakitDvTL)}</td>
      <td data-lbl="Kart">${fmt(z.kart)}</td><td data-lbl="Cari">${fmt(z.cari)}</td><td data-lbl="Masa">${z.count}</td>
      <td data-lbl="Kasa">${fmt(z.openingFloat)} → ${fmt(z.nextFloat)}</td><td class="muted" data-lbl="Kapatan">${esc(z.closedBy)}</td></tr>`).join('');
  const fcList=floatHistoryExpanded?(db.floatChecks||[]):(db.floatChecks||[]).slice(-3);
  const fcRows=fcList.slice().reverse().map(c=>`<tr>
      <td>${trDate(c.date)}</td><td data-lbl="Beklenen">${fmt(c.expected)}</td><td data-lbl="Girilen">${fmt(c.actual)}</td>
      <td data-lbl="Durum">${c.match?'<span class="green">Uyumlu</span>':'<span class="red">Uyuşmuyor</span>'}</td>
      <td class="muted" data-lbl="Açan">${esc(c.by)}</td><td class="muted" data-lbl="Saat">${trDT(c.at)}</td></tr>`).join('');
  /* ikramlar: tüm masa ikramı (satır başına bir kayıt) ve ürün bazlı ikramlar (ürün başına bir kayıt) */
  const ikramRow=(s,who,by,what,amtTL)=>`<tr>
      <td>${trDate(s.bd)}</td><td data-lbl="Masa">${esc(s.table)}</td>
      <td data-lbl="Kime"><b>${esc(who)}</b></td>
      <td class="muted" data-lbl="Veren">${esc(by)}</td>
      <td data-lbl="İçerik">${esc(what)}</td>
      <td class="num" data-lbl="Tutar (TL)">${fmt(amtTL)}</td></tr>`;
  const ikramRows=stR.sales.slice().reverse().flatMap(s=>{
    const out=[], plain=s.items.filter(i=>!i.ikram);
    if(s.complimentary && plain.length) out.push(ikramRow(s, s.complimentary.name, s.complimentary.by, plain.map(i=>fmtQ(i.qty)+'x '+i.name).join(', '), (s.sub-(s.ikramAmt||0))*s.rate));
    s.items.filter(i=>i.ikram).forEach(i=>out.push(ikramRow(s, i.ikram.name, i.ikram.by, fmtQ(i.qty)+'x '+i.name, i.qty*i.unit*s.rate)));
    return out;
  }).join('');
  return `<div class="page-head">
      <div><h1>İstatistikler</h1><div class="sub">${db.day.open?'Açık iş günü: '+trDate(db.day.date):'Kasa kapalı · Son gün: '+trDate(today)}</div></div>
    </div>
    <div class="sect"><div class="st">Bugün (${trDate(today)})</div>
      <div class="stat-row">
        ${statCard(fmt(st.ciro),'Toplam Ciro','accent')}
        ${statCard(fmt(st.nakitTL+st.nakitDvTL),'Nakit','green', st.nakitDvTL?`TL ${fmt(st.nakitTL)} · Döviz ${fmt(st.nakitDvTL)}`:'')}
        ${statCard(fmt(st.kart),'Kredi Kartı','blue')}
        ${statCard(fmt(st.cari),'Cari','purple', (st.tahN+st.tahK)?`Tahsilat: ${fmt(st.tahN+st.tahK)}`:'')}
        ${statCard(st.count,'Masa Sayısı','')}
        ${guestStatCard(st)}
      </div></div>
    <div class="two-col">
      <div class="panel"><div class="st" style="margin-bottom:10px">BU HAFTA</div>${miniRows(stW)}</div>
      <div class="panel"><div class="st" style="margin-bottom:10px">BU AY</div>${miniRows(stM)}</div>
    </div>
    <div class="panel mt16"><div class="st" style="margin-bottom:12px">ÖZEL TARİH ARALIĞI</div>
      <div class="range-bar">
        <div class="fld"><span>Başlangıç</span><input type="date" id="rgF" class="inp dte" value="${statsFrom}"></div>
        <div class="fld"><span>Bitiş</span><input type="date" id="rgT" class="inp dte" value="${statsTo}"></div>
        <button class="btn accent" onclick="applyRange()">Göster</button>
        ${statsCustom?`<button class="btn ghost" onclick="statsCustom=false;render()">Bugüne Dön</button>`:''}
        <button class="btn" onclick="exportCSV('${listF}','${listT}')">CSV İndir</button>
      </div>
      ${statsCustom?`<div class="stat-row mt16">
        ${statCard(fmt(stR.ciro),'Toplam Ciro','accent')}
        ${statCard(fmt(stR.nakitTL+stR.nakitDvTL),'Nakit','green',`TL ${fmt(stR.nakitTL)} · Döviz ${fmt(stR.nakitDvTL)}`)}
        ${statCard(fmt(stR.kart),'Kredi Kartı','blue')}
        ${statCard(fmt(stR.cari),'Cari','purple')}
        ${statCard(stR.count,'Masa Sayısı','')}
      </div>`:''}
    </div>
    <div class="two-col mt16">
      <div class="panel" style="grid-column:1/-1">
        <div class="st" style="margin-bottom:12px">SİPARİŞLER (${trDate(listF)}${listF!==listT?' – '+trDate(listT):''})</div>
        ${orders?`<table class="dt"><thead><tr><th>Tarih</th><th>Çek No</th><th>Masa</th><th>Garson</th><th>Açılış</th><th>Kapanış</th><th>Tutar</th><th>Ödeme</th><th></th></tr></thead><tbody>${orders}</tbody></table>`
                :`<div class="muted small">Bu aralıkta sipariş bulunmuyor.</div>`}
      </div>
    </div>
    <div class="panel mt16">
      <div class="page-head" style="margin-bottom:10px">
        <div class="st">GÜN SONU GEÇMİŞİ (Z RAPORLARI)${zHistoryExpanded?'':' — SON 3 GÜN'}</div>
        ${db.dayHistory.length>3?`<button class="btn sm ghost" onclick="zHistoryExpanded=!zHistoryExpanded;render()">${zHistoryExpanded?'Son 3 Günü Göster':'Tüm Geçmişi Göster'}</button>`:''}
      </div>
        ${zRows?`<table class="dt"><thead><tr><th>Tarih</th><th>Ciro</th><th>Yemek</th><th>Nakit</th><th>Kart</th><th>Cari</th><th>Masa</th><th>Kasa</th><th>Kapatan</th></tr></thead><tbody>${zRows}</tbody></table>`
              :'<div class="muted small">Henüz gün sonu alınmadı.</div>'}
    </div>
    <div class="panel mt16">
      <div class="st" style="margin-bottom:10px">İKRAMLAR (${trDate(listF)}${listF!==listT?' – '+trDate(listT):''})</div>
      ${ikramRows?`<table class="dt"><thead><tr><th>Tarih</th><th>Masa</th><th>Kime</th><th>Veren</th><th>İçerik</th><th>Tutar (TL)</th></tr></thead><tbody>${ikramRows}</tbody></table>`
            :'<div class="muted small">Bu aralıkta ikram kaydı yok.</div>'}
    </div>
    <div class="panel mt16">
      <div class="page-head" style="margin-bottom:10px">
        <div class="st">KASA AÇILIŞ KONTROLLERİ${floatHistoryExpanded?'':' — SON 3 GÜN'}</div>
        ${(db.floatChecks||[]).length>3?`<button class="btn sm ghost" onclick="floatHistoryExpanded=!floatHistoryExpanded;render()">${floatHistoryExpanded?'Son 3 Günü Göster':'Tüm Geçmişi Göster'}</button>`:''}
      </div>
      ${fcRows?`<table class="dt"><thead><tr><th>Tarih</th><th>Beklenen (Dün Bırakılan)</th><th>Girilen</th><th>Durum</th><th>Açan</th><th>Saat</th></tr></thead><tbody>${fcRows}</tbody></table>`
            :'<div class="muted small">Henüz kasa açılış kaydı yok.</div>'}
    </div>`;
}
function applyRange(){
  statsFrom=$('#rgF').value||iso(); statsTo=$('#rgT').value||iso();
  if(statsFrom>statsTo){const x=statsFrom;statsFrom=statsTo;statsTo=x;}
  statsCustom=true; render();
}
function orderDetail(id){
  const s=findCheck(id); if(!s) return;
  const c=s.currency, pays=s.parts||[];
  const items=s.items.map(i=>`<div class="sum-line"><span>${esc(i.name)} <span class="muted">x${i.qty}</span>${i.ikram?` <span class="badge low">İkram — ${esc(i.ikram.name)}</span>`:''}</span><b>${fmt(i.qty*i.unit,c)}</b></div>`).join('');
  const dOnly=s.disc-(s.ikramAmt||0); /* ürün ikramları dışındaki indirim */
  showModal(`<div class="m-head"><h3>Sipariş Detayı — ${esc(s.table)} <span class="muted small" style="font-weight:500">Çek #${fmtCheckNo(s.checkNo)}</span></h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="muted small mb12">${trDate(s.bd)} · Garson: ${esc(s.waiter||'')} · Açılış ${trTime(s.openedAt)} → Kapanış ${trTime(s.closedAt)}
      ${s.origTable!==s.table?`<br>Orijinal masa: ${esc(s.origTable)}`:''}
      ${checkIsOpen(s)?'<br><b>Masa şu an açık</b> (hesap henüz kapatılmadı)':''}</div>
    ${items}
    <div class="mt12">
      <div class="trow"><span>Ara Toplam</span><b>${fmt(s.sub,c)}</b></div>
      ${s.ikramAmt>0?`<div class="trow"><span>İkram (ürün)</span><b class="green">−${fmt(s.ikramAmt,c)}</b></div>`:''}
      ${dOnly>1e-9?`<div class="trow"><span>${s.complimentary?'İkram — '+esc(s.complimentary.name)+' <span class="muted tiny">(veren: '+esc(s.complimentary.by)+')</span>':'İndirim'}</span><b class="green">−${fmt(dOnly,c)}</b></div>`:''}
      ${s.serv>0?`<div class="trow"><span>Servis Ücreti</span><b class="amber">+${fmt(s.serv,c)}</b></div>`:''}
      <div class="trow big"><span>Toplam</span><span class="v">${fmt(s.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (Kur ${fmt(s.rate)})</span><b class="accent">${fmt(s.totalTL)}</b></div>`:''}
      <div class="trow"><span>Ödeme Yöntemi</span><b>${checkPayLabel(s)}</b></div>
    </div>
    ${pays.length>1?`<div class="osec"><div class="osec-t">Ödemeler (${pays.length})</div>${pays.map(p=>`<div class="opay">
        <div class="opay-h"><span class="muted tiny">${trTime(p.closedAt)}</span><span class="opay-m">${payLabel(p)}</span><b>${fmt(p.total,c)}</b></div>
        <div class="opay-i muted">${p.items.map(i=>fmtQ(i.qty)+'x '+esc(i.name)).join(', ')}</div></div>`).join('')}</div>`:''}
    <div class="m-actions">
      ${checkReopenable(s)?`<button class="btn red" onclick="reopenSaleAsk('${s.id}')">Çeki Yeniden Aç</button>`:''}
      <button class="btn accent" onclick="closeModal()">Kapat</button>
    </div>`);
}

/* --- yanlışlıkla kapatılan çeki yeniden açma (sadece admin) --- */
function reopenSaleAsk(id){
  if(!user || user.role!=='admin' || remoteViewOnly()) return;
  const s=findCheck(id); if(!s) return; /* ayrı ödemeli masada s: birleşik çek, id: splitId */
  if(s.parts ? !s.parts.every(p=>p.bd===db.day.date) : s.bd!==db.day.date){toast('Yalnızca bugünün çekleri yeniden açılabilir','err');return}
  if(checkIsOpen(s)){toast('Bu masa zaten açık','err');return}
  const empties=db.tables.filter(x=>x.status==='empty');
  if(!empties.length){toast('Yeniden açmak için boş masa yok','err');return}
  const cards=empties.map(x=>`<button class="cur-card" onclick="reopenSaleTo('${id}','${x.id}')">${esc(x.name)}</button>`).join('');
  showModal(`<div class="m-head"><h3>Çeki Yeniden Aç <span class="muted small" style="font-weight:500">&nbsp;${esc(s.table)} → hangi masaya?</span></h3>
    <button class="icon-b" onclick="closeModal()">✕</button></div>
    <p class="muted small">${s.parts
      ? `Bu çek ayrı ödemelerle alınmıştı (${s.parts.length} ödeme). Ödemeler satış kayıtlarında olduğu gibi KALIR ve değiştirilemez; çek, ödemeleriyle birlikte (hepsi ödenmiş olarak) seçtiğiniz boş masaya açılır. Yeni ürün ekleyip kalanı ödeyebilir ya da masayı yeniden kapatabilirsiniz. Stok tekrar düşülmez.`
      : 'Bu çek satış kaydından silinir ve kapanmadan önceki haliyle seçtiğiniz boş masaya açık sipariş olarak taşınır. Stok tekrar düşülmez (sipariş girilirken zaten düşülmüştü).'}</p>
    <div class="cur-grid">${cards}</div>`,true);
}
function reopenSaleTo(saleId, tableId){
  if(!user || user.role!=='admin' || remoteViewOnly()) return;
  const dst=getTable(tableId); if(!dst||dst.status!=='empty') return;
  const chk=findCheck(saleId);
  if(chk && chk.parts){ reopenSplitTo(chk,dst); return; } /* ayrı ödemeli çek: bkz. ui/js/split.js */
  const idx=db.sales.findIndex(x=>x.id===saleId); if(idx<0) return;
  const s=db.sales[idx];
  dst.status='open';
  dst.customName = (s.table!==s.origTable) ? s.table : null;
  dst.currency=s.currency; dst.openedAt=s.openedAt; dst.openedBy=s.waiter;
  dst.items=s.items.map(i=>({lid:uid(), mid:null, name:i.name, cat:i.cat||'Diğer', qty:i.qty, unit:i.unit, sent:i.qty, variant:null, recipe:[], ...(i.ikram?{ikram:{...i.ikram}}:{})}));
  dst.complimentary = s.complimentary ? {name:s.complimentary.name, by:s.complimentary.by} : null;
  dst.discount = s.discount ? {...s.discount} : (dst.complimentary ? {type:'pct', value:100} : (s.disc-(s.ikramAmt||0)>1e-9 ? {type:'amt', value:s.disc-(s.ikramAmt||0)} : null));
  dst.service = s.serv>0 ? {type:'amt', value:s.serv} : null;
  dst.couvert = s.couvert ? {...s.couvert} : null;
  dst.checkNo = s.checkNo || null;
  if(s.method==='cari' && s.cariName){
    const acc=db.cari.find(x=>x.name.toLowerCase()===s.cariName.toLowerCase());
    if(acc) acc.entries=acc.entries.filter(e=>e.saleId!==s.id);
  }
  db.sales.splice(idx,1);
  saveDB(); closeModal(); render();
  toast('Çek yeniden açıldı: '+dst.name,'ok');
}
function exportCSV(f,t){
  const S=groupChecks(db.sales.filter(s=>s.bd>=f&&s.bd<=t)); /* ayrı ödemeli masa tek satır */
  if(!S.length){toast('Bu aralıkta dışa aktarılacak satış yok','err');return}
  const head='Tarih;Masa;Garson;Acilis;Kapanis;ParaBirimi;AraToplam;Indirim;Servis;Toplam;ToplamTL;Odeme;Cari';
  const rows=S.map(s=>[trDate(s.bd),s.table,s.waiter||'',trTime(s.openedAt),trTime(s.closedAt),s.currency,
    s.sub.toFixed(2).replace('.',','),s.disc.toFixed(2).replace('.',','),s.serv.toFixed(2).replace('.',','),
    s.total.toFixed(2).replace('.',','),s.totalTL.toFixed(2).replace('.',','),checkPayLabel(s).replace(/;/g,','),s.cariName||''
  ].map(v=>String(v)).join(';'));
  const blob=new Blob(['\uFEFF'+head+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='walky_satislar_'+f+'_'+t+'.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
