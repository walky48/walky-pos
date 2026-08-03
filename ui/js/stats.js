'use strict';
/* ============================================================
   WALKY POS — istatistikler (muhasebe + admin)
   ============================================================ */
function statCard(ic,val,lbl,cls,sub){
  return `<div class="stat"><span class="si">${ic}</span><div>
    <div class="sv ${cls||''}">${val}</div><div class="sl">${lbl}</div>${sub?`<div class="ss">${sub}</div>`:''}</div></div>`;
}
function miniRows(st){
  return `<div class="mini-row"><span>💰 Toplam Ciro</span><span class="v accent">${fmt(st.ciro)}</span></div>
    <div class="mini-row"><span>💵 Nakit (TL)</span><span class="v green">${fmt(st.nakitTL)}</span></div>
    <div class="mini-row"><span>💱 Nakit (Döviz)</span><span class="v green">${fmt(st.nakitDvTL)}${(st.dvUSD||st.dvEUR)?` <span class="muted tiny">${st.dvUSD?fmt(st.dvUSD,'USD'):''} ${st.dvEUR?fmt(st.dvEUR,'EUR'):''}</span>`:''}</span></div>
    <div class="mini-row"><span>💳 Kredi Kartı</span><span class="v blue">${fmt(st.kart)}</span></div>
    <div class="mini-row"><span>🧾 Cari (Veresiye)</span><span class="v purple">${fmt(st.cari)}</span></div>
    <div class="mini-row"><span>🪑 Masa Sayısı</span><span class="v">${st.count}</span></div>`;
}
function viewStats(){
  const today=db.day.open?db.day.date:iso();
  const st=computeStats(today,today);
  const stW=computeStats(weekStartISO(),iso());
  const stM=computeStats(monthStartISO(),iso());
  const listF=statsCustom?statsFrom:today, listT=statsCustom?statsTo:today;
  const stR=computeStats(listF,listT);
  const orders=stR.sales.slice().reverse().map(s=>`<tr>
      <td>${trDate(s.bd)}</td><td data-lbl="Masa"><b>${esc(s.table)}</b></td><td class="muted" data-lbl="Garson">${esc(s.waiter||'')}</td>
      <td data-lbl="Açılış">${trTime(s.openedAt)}</td><td data-lbl="Kapanış">${trTime(s.closedAt)}</td>
      <td class="num" data-lbl="Tutar">${fmt(s.totalTL)}</td><td data-lbl="Ödeme">${payLabel(s)}</td>
      <td class="right tdact"><button class="rowbtn" onclick="orderDetail('${s.id}')">Detay</button></td></tr>`).join('');
  // en çok satanlar
  const agg={};
  stR.sales.forEach(s=>s.items.forEach(i=>{
    if(!agg[i.name]) agg[i.name]={q:0, r:0};
    agg[i.name].q+=i.qty; agg[i.name].r+=i.qty*i.unit*s.rate;
  }));
  const top=Object.entries(agg).sort((a,b)=>b[1].r-a[1].r).slice(0,8)
    .map(([n,v],ix)=>`<div class="mini-row"><span><span class="muted">${ix+1}.</span> ${esc(n)}</span><span><span class="muted small">${fmtQ(v.q)} adet</span> &nbsp;<b>${fmt(v.r)}</b></span></div>`).join('');
  const zRows=db.dayHistory.slice().reverse().map(z=>`<tr>
      <td>${trDate(z.date)}</td><td class="num" data-lbl="Ciro">${fmt(z.ciro)}</td><td data-lbl="Nakit">${fmt(z.nakitTL+z.nakitDvTL)}</td>
      <td data-lbl="Kart">${fmt(z.kart)}</td><td data-lbl="Cari">${fmt(z.cari)}</td><td data-lbl="Masa">${z.count}</td>
      <td data-lbl="Kasa">${fmt(z.openingFloat)} → ${fmt(z.nextFloat)}</td><td class="muted" data-lbl="Kapatan">${esc(z.closedBy)}</td></tr>`).join('');
  const fcRows=(db.floatChecks||[]).slice().reverse().map(c=>`<tr>
      <td>${trDate(c.date)}</td><td data-lbl="Beklenen">${fmt(c.expected)}</td><td data-lbl="Girilen">${fmt(c.actual)}</td>
      <td data-lbl="Durum">${c.match?'<span class="green">✓ Uyumlu</span>':'<span class="red">⚠ Uyuşmuyor</span>'}</td>
      <td class="muted" data-lbl="Açan">${esc(c.by)}</td><td class="muted" data-lbl="Saat">${trDT(c.at)}</td></tr>`).join('');
  return `<div class="page-head">
      <div><h1>İstatistikler</h1><div class="sub">${db.day.open?'Açık iş günü: '+trDate(db.day.date):'Kasa kapalı · Son gün: '+trDate(today)}</div></div>
    </div>
    <div class="sect"><div class="st">Bugün (${trDate(today)})</div>
      <div class="stat-row">
        ${statCard('💰',fmt(st.ciro),'Toplam Ciro','accent')}
        ${statCard('💵',fmt(st.nakitTL+st.nakitDvTL),'Nakit','green', st.nakitDvTL?`TL ${fmt(st.nakitTL)} · Döviz ${fmt(st.nakitDvTL)}`:'')}
        ${statCard('💳',fmt(st.kart),'Kredi Kartı','blue')}
        ${statCard('🧾',fmt(st.cari),'Cari','purple', (st.tahN+st.tahK)?`Tahsilat: ${fmt(st.tahN+st.tahK)}`:'')}
        ${statCard('🪑',st.count,'Masa Sayısı','')}
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
        ${statCard('💰',fmt(stR.ciro),'Toplam Ciro','accent')}
        ${statCard('💵',fmt(stR.nakitTL+stR.nakitDvTL),'Nakit','green',`TL ${fmt(stR.nakitTL)} · Döviz ${fmt(stR.nakitDvTL)}`)}
        ${statCard('💳',fmt(stR.kart),'Kredi Kartı','blue')}
        ${statCard('🧾',fmt(stR.cari),'Cari','purple')}
        ${statCard('🪑',stR.count,'Masa Sayısı','')}
      </div>`:''}
    </div>
    <div class="two-col mt16">
      <div class="panel" style="grid-column:1/-1">
        <div class="st" style="margin-bottom:12px">SİPARİŞLER (${trDate(listF)}${listF!==listT?' – '+trDate(listT):''})</div>
        ${orders?`<table class="dt"><thead><tr><th>Tarih</th><th>Masa</th><th>Garson</th><th>Açılış</th><th>Kapanış</th><th>Tutar</th><th>Ödeme</th><th></th></tr></thead><tbody>${orders}</tbody></table>`
                :`<div class="muted small">Bu aralıkta sipariş bulunmuyor.</div>`}
      </div>
    </div>
    <div class="two-col mt16">
      <div class="panel"><div class="st" style="margin-bottom:10px">EN ÇOK SATANLAR</div>${top||'<div class="muted small">Henüz veri yok.</div>'}</div>
      <div class="panel"><div class="st" style="margin-bottom:10px">GÜN SONU GEÇMİŞİ (Z RAPORLARI)</div>
        ${zRows?`<table class="dt"><thead><tr><th>Tarih</th><th>Ciro</th><th>Nakit</th><th>Kart</th><th>Cari</th><th>Masa</th><th>Kasa</th><th>Kapatan</th></tr></thead><tbody>${zRows}</tbody></table>`
              :'<div class="muted small">Henüz gün sonu alınmadı.</div>'}
      </div>
    </div>
    <div class="panel mt16">
      <div class="st" style="margin-bottom:10px">KASA AÇILIŞ KONTROLLERİ</div>
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
  const s=db.sales.find(x=>x.id===id); if(!s) return;
  const c=s.currency;
  const items=s.items.map(i=>`<div class="sum-line"><span>${esc(i.name)} <span class="muted">x${i.qty}</span></span><b>${fmt(i.qty*i.unit,c)}</b></div>`).join('');
  showModal(`<div class="m-head"><h3>Sipariş Detayı — ${esc(s.table)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="muted small mb12">${trDate(s.bd)} · Garson: ${esc(s.waiter||'')} · Açılış ${trTime(s.openedAt)} → Kapanış ${trTime(s.closedAt)}
      ${s.origTable!==s.table?`<br>Orijinal masa: ${esc(s.origTable)}`:''}</div>
    ${items}
    <div class="mt12">
      <div class="trow"><span>Ara Toplam</span><b>${fmt(s.sub,c)}</b></div>
      ${s.disc>0?`<div class="trow"><span>İndirim</span><b class="green">−${fmt(s.disc,c)}</b></div>`:''}
      ${s.serv>0?`<div class="trow"><span>Servis Ücreti</span><b class="amber">+${fmt(s.serv,c)}</b></div>`:''}
      <div class="trow big"><span>Toplam</span><span class="v">${fmt(s.total,c)}</span></div>
      ${c!=='TL'?`<div class="trow"><span>TL Karşılığı (Kur ${fmt(s.rate)})</span><b class="accent">${fmt(s.totalTL)}</b></div>`:''}
      <div class="trow"><span>Ödeme Yöntemi</span><b>${payLabel(s)}</b></div>
    </div>
    <div class="m-actions"><button class="btn accent" onclick="closeModal()">Kapat</button></div>`);
}
function exportCSV(f,t){
  const S=db.sales.filter(s=>s.bd>=f&&s.bd<=t);
  if(!S.length){toast('Bu aralıkta dışa aktarılacak satış yok','err');return}
  const head='Tarih;Masa;Garson;Acilis;Kapanis;ParaBirimi;AraToplam;Indirim;Servis;Toplam;ToplamTL;Odeme;Cari';
  const rows=S.map(s=>[trDate(s.bd),s.table,s.waiter||'',trTime(s.openedAt),trTime(s.closedAt),s.currency,
    s.sub.toFixed(2).replace('.',','),s.disc.toFixed(2).replace('.',','),s.serv.toFixed(2).replace('.',','),
    s.total.toFixed(2).replace('.',','),s.totalTL.toFixed(2).replace('.',','),payLabel(s).replace(/;/g,','),s.cariName||''
  ].map(v=>String(v)).join(';'));
  const blob=new Blob(['\uFEFF'+head+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='walky_satislar_'+f+'_'+t+'.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
