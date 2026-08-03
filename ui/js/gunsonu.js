'use strict';
/* ============================================================
   WALKY POS — gün sonu (Z raporu)
   ============================================================ */
function openGunSonu(){
  if(db.tables.some(t=>t.status==='open')){toast('Açık masalar var — önce tüm hesapları alın','err');return}
  const st=computeStats(db.day.date, db.day.date);
  const drawer=db.day.openingFloat + st.nakitTL + st.tahN;
  showModal(`<div class="m-head"><h3>Gün Sonu — ${trDate(db.day.date)}</h3><button class="icon-b" onclick="closeModal()">✕</button></div>
    <div class="mini-row"><span>💰 Toplam Ciro</span><span class="v accent">${fmt(st.ciro)}</span></div>
    <div class="mini-row"><span>💵 Nakit (TL)</span><span class="v">${fmt(st.nakitTL)}</span></div>
    <div class="mini-row"><span>💱 Nakit (Döviz, ₺ karşılığı)</span><span class="v">${fmt(st.nakitDvTL)}${(st.dvUSD||st.dvEUR)?` <span class="muted tiny">${st.dvUSD?fmt(st.dvUSD,'USD'):''} ${st.dvEUR?fmt(st.dvEUR,'EUR'):''}</span>`:''}</span></div>
    <div class="mini-row"><span>💳 Kredi Kartı</span><span class="v">${fmt(st.kart)}</span></div>
    <div class="mini-row"><span>🧾 Cari (Veresiye)</span><span class="v">${fmt(st.cari)}</span></div>
    ${(st.tahN+st.tahK)?`<div class="mini-row"><span>📥 Cari Tahsilat</span><span class="v green">${fmt(st.tahN+st.tahK)}</span></div>`:''}
    <div class="mini-row"><span>🪑 Masa Sayısı</span><span class="v">${st.count}</span></div>
    <div class="mini-row"><span>🔓 Açılış Kasa Fazlası</span><span class="v">${fmt(db.day.openingFloat)}</span></div>
    <div class="mini-row" style="border-color:var(--accent)"><span><b>Beklenen Kasa (TL Nakit)</b></span><span class="v accent">${fmt(drawer)}</span></div>
    <label class="fl">Ertesi güne bırakılan kasa fazlası (₺)</label>
    <input id="nfVal" class="inp" inputmode="decimal" placeholder="örn. 500">
    <p class="muted tiny mt8">Sabah ilk müşteriye para üstü verebilmek için kasada bırakılan bozuk paradır. Kasa yarın bu tutarla açılır.</p>
    <div class="m-actions"><button class="btn ghost" onclick="closeModal()">Vazgeç</button>
    <button class="btn accent" onclick="closeDay()">Günü Kapat</button></div>`,true);
}
function closeDay(){
  const nf=num($('#nfVal').value);
  if(nf<0){toast('Geçerli bir tutar girin','err');return}
  const st=computeStats(db.day.date, db.day.date);
  db.dayHistory.push({date:db.day.date, ciro:st.ciro, nakitTL:st.nakitTL, nakitDvTL:st.nakitDvTL,
    dvUSD:st.dvUSD, dvEUR:st.dvEUR, kart:st.kart, cari:st.cari, tahN:st.tahN, tahK:st.tahK, count:st.count,
    openingFloat:db.day.openingFloat, nextFloat:nf, closedBy:user.name, closedAt:Date.now()});
  db.day={open:false, date:null, openingFloat:0, lastNextFloat:nf};
  saveDB(); closeModal(); render();
  toast('Gün sonu alındı, kasa kapatıldı ✓','ok');
}
