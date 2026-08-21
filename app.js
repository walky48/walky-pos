'use strict';

function render(){
  const app=$('#app');
  if(!user){
    app.innerHTML=loginHTML();
    const pi=$('#loginPass'); if(pi) pi.onkeydown=e=>{if(e.key==='Enter')doLogin()};
    const pr=$('#rmPass'); if(pr) pr.onkeydown=e=>{if(e.key==='Enter')remoteLogin()};
    return;
  }
  if((user.role==='garson'||user.role==='admin') && !db.day.open){ app.innerHTML=kasaHTML(); return; }
  if(view==='order' && activeTableId){ app.innerHTML=orderHTML(); return; }
  app.innerHTML=layoutHTML();
}

/* ---------- başlatma ---------- */
db = loadDB() || seedDB();
// eski kayıtlarda eksik alan kalmasın
if(!db.stockLog) db.stockLog=[];
if(!db.dayHistory) db.dayHistory=[];
if(!db.cari) db.cari=[];
if(!db.floatChecks) db.floatChecks=[];
if(!db.expenses) db.expenses=[];
if(!db.menuRealSeeded){
  db.menu=seedDB().menu;
  db.menuRealSeeded=true;
}
// alkol stokları test amaçlı dolduruldu (cl'ler 1000, biralar 100 adet) — tek seferlik
if(!db.stockAlkolSeeded){
  db.stock=seedDB().stock;
  db.stockAlkolSeeded=true;
}
// depoda artık sadece alkol kalemleri tutuluyor — eski demo yiyecek/içecek stokları kaldırıldı, tek seferlik
if(!db.stockNonAlkolRemoved){
  db.stock=db.stock.filter(s=>s.cat==='Alkol');
  db.stockNonAlkolRemoved=true;
}
// Dolar fiyatları artık Euro fiyatından ve güncel kurdan otomatik hesaplanıyor — mevcut menüye bir kerelik uygulanır
if(!db.usdFromEurApplied){
  recalcMenuUsdPrices();
  db.usdFromEurApplied=true;
}

if(!db.tables25Seeded){
  if(db.tables.every(t=>t.status==='empty')) db.tables=seedDB().tables;
  db.tables25Seeded=true;
}
// gerçek personel hesapları tanımlandı (isim/şifre güncellemeleri + garsonlar) — tek seferlik
if(!db.usersRealSeeded){
  const byUser=un=>db.users.find(u=>u.username===un);
  const admin=byUser('admin'); if(admin){ admin.name='Bahar'; admin.pass='7811'; }
  const depo=byUser('depo'); if(depo){ depo.pass='2207'; }
  const muhasebe=byUser('muhasebe'); if(muhasebe){ muhasebe.name='Funda'; muhasebe.pass='4823'; }
  db.users=db.users.filter(u=>u.username!=='garson');
  [['kadir','Kadir'],['muhammed','Muhammed'],['fevzi','Fevzi'],['ugur','Uğur']].forEach(([un,name])=>{
    if(!byUser(un)) db.users.push({id:uid(), username:un, pass:'1234', name, role:'garson'});
  });
  db.usersRealSeeded=true;
}
// admin girişi kullanıcı adı da isme uydu — tek seferlik
if(!db.adminUsernameRenamed){
  const admin=db.users.find(u=>u.username==='admin');
  if(admin) admin.username='bahar';
  db.adminUsernameRenamed=true;
}
// test verileri temizlendi (satışlar, gün sonu geçmişi, kasa kontrolleri, cari, stok miktarları) — menüye dokunulmadı, tek seferlik
if(!db.testDataCleared){
  db.sales=[]; db.dayHistory=[]; db.floatChecks=[]; db.cari=[]; db.stockLog=[];
  db.stock.forEach(s=>{ s.qty=0; });
  db.testDataCleared=true;
}
// bazı kokteyl/kadeh reçeteleri düzeltildi — sadece bu ürünlerin reçetesi değişir, isim/fiyat/diğer ürünler etkilenmez, tek seferlik
if(!db.recipeFix1Applied){
  const sd=seedDB();
  ['Beyaz Şarap (Pinot Grigio)','Kırmızı Şarap (Pasqua Merlot)','Roze Şarap (Pinot Grigio Rose)','Prosecco',
   'Negroni','Chilli Negroni','Aperol Spritz','Ananas','Kavun','Çilek','Şeftali'].forEach(name=>{
    const src=sd.menu.find(m=>m.name===name), dst=db.menu.find(m=>m.name===name);
    if(src && dst) dst.recipe=src.recipe;
  });
  db.recipeFix1Applied=true;
}
// içecek/kokteyl malzemesi stokları eklendi (kola, meşrubat, şurup, püre...); Azumare Sunset eklendi;
// etkilenen kokteyl/sangria reçeteleri güncellendi — tek seferlik
if(!db.stockDrinksAdded){
  const sd=seedDB();
  const byName=(arr,n)=>arr.find(x=>x.name===n);
  ['Cola','Fanta','Sprite','Redbull','S. Pelegrino 25cl','S. Pelegrino 70cl','Su 330ml','Su 750ml','Soda','Tonik',
   'Şeker Şurubu','Karamel Şurubu','Vanilya Şurubu','Çarkıfelek Püresi','Çilek Püresi','Mango Püresi','Elma Püresi'].forEach(name=>{
    if(!byName(db.stock,name)){
      const s=byName(sd.stock,name);
      if(s) db.stock.push({...s});
    }
  });
  db.menu=db.menu.filter(m=>m.name!=='Alkolsüz Kokteyl');
  if(!byName(db.menu,'Azumare Sunset')){
    const m=byName(sd.menu,'Azumare Sunset');
    if(m) db.menu.push({id:uid(), name:m.name, cat:m.cat, price:{...m.price}, recipe:m.recipe.map(r=>({...r}))});
  }
  ['Azumare Passion','Azumare Chilli Passion','NO1','Aperol Margarita','Moscow Mule','Aperol Spritz',
   'Long Island Iced Tea','Long Island Ice Tea (Şişe 1LT)','Sunset (Şişe 1LT)','Ananas','Kavun','Çilek','Şeftali',
   'Cola','Fanta','Sprite','Redbull','S. Pelegrino 25cl','S. Pelegrino 70cl','Su 330ml','Su 750ml','Soda'].forEach(name=>{
    const src=byName(sd.menu,name), dst=byName(db.menu,name);
    if(src && dst) dst.recipe=src.recipe.map(r=>({...r}));
  });
  db.stockDrinksAdded=true;
}
// Mojito / Ice Latte / Alkolsüz Mojito artık tek ürün + tıklayınca açılan seçenek (meyve/aroma)
// penceresi ile satılıyor; önceki oturumda ayrı satır olarak eklenmiş çeşitler varsa birleştirilir — tek seferlik
if(!db.menuVariantsAdded){
  const sd=seedDB();
  const byName=(arr,n)=>arr.find(x=>x.name===n);
  db.menu=db.menu.filter(m=>!['Mojito (Çilekli)','Mojito (Elmalı)','Ice Latte (Sade)','Ice Latte (Karamelli)','Ice Latte (Vanilyalı)',
    'Alkolsüz Mojito (Çilekli)','Alkolsüz Mojito (Elmalı)'].includes(m.name));
  ['Mojito','Ice Latte','Alkolsüz Mojito'].forEach(name=>{
    const src=byName(sd.menu,name); if(!src) return;
    let dst=byName(db.menu,name);
    if(!dst){ dst={id:uid(), name:src.name, cat:src.cat, price:{...src.price}}; db.menu.push(dst); }
    dst.recipe=src.recipe.map(r=>({...r}));
    dst.variants=src.variants.map(v=>({label:v.label, extra:v.extra.map(e=>({...e}))}));
  });
  db.menuVariantsAdded=true;
}
// Bahar ile aynı yetkilere sahip ikinci bir yönetici hesabı (Mahmut) eklendi — tek seferlik
if(!db.mahmutAdminAdded){
  if(!db.users.some(u=>u.username==='mahmut')){
    db.users.push({id:uid(), username:'mahmut', pass:'9274', name:'Mahmut', role:'admin'});
  }
  db.mahmutAdminAdded=true;
}
initSync();
if(typeof tryReconnectPrinter==='function') tryReconnectPrinter();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
