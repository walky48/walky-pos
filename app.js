'use strict';

function render(){
  const app=$('#app');
  if(!user){
    app.innerHTML=loginHTML();
    const pi=$('#loginPass'); if(pi) pi.onkeydown=e=>{if(e.key==='Enter')doLogin()};
    const pr=$('#rmPass'); if(pr) pr.onkeydown=e=>{if(e.key==='Enter')remoteLogin()};
    return;
  }
  if(!db.day.open){
    // uzak garson (ör. telefonundan sipariş giren personel) fiziksel kasa
    // sayımını yapamaz AMA gün açılmadan sipariş de giremez — aksi halde
    // satışlar hangi iş gününe ait olduğu belirsiz (tarihsiz) kaydedilir.
    // Sadece kasadaki fiziksel cihaz gün açılışını yapabilir. Bu restoran
    // "Uzaktan Sipariş Girişi"ni açtıysa (remoteViewOnly()===false) uzaktan
    // bağlanan yönetici de aynı şekilde gün açılana kadar bekler; sadece
    // salt-okunur kalan yönetici (remoteViewOnly) geçmiş istatistikleri
    // görüntülemeye devam edebilsin diye bu ekrana düşmez. muhasebe de hiç
    // sipariş girmediği (yalnızca İstatistikler/Stok/Cari görüntülediği) için
    // aynı şekilde muaf — gün kapalıyken de (ör. mesai dışı ay sonu kontrolü)
    // uzaktan bağlanıp bakabilmeli, kasanın açılmasını beklemesine gerek yok.
    if(remoteMode && !remoteViewOnly() && user.role!=='muhasebe'){ app.innerHTML=remoteDayClosedHTML(); return; }
    if((user.role==='garson'||user.role==='admin') && !remoteMode && !(user.role==='admin' && peekMode)){ app.innerHTML=kasaHTML(); return; }
  }
  if(view==='order' && activeTableId){ app.innerHTML=orderHTML(); return; }
  app.innerHTML=layoutHTML();
}

/* ---------- başlatma ---------- */
/* localStorage'ı boş olan yeni bir cihaz/tarayıcı (ör. başka bir restoranın
   kasası) tamamen boş kurulumla başlar — bkz. backend/seed.js seedDBBlank().
   Azumare'nin kendi cihazları zaten kayıtlı gerçek verisini bulduğu için
   bu satıra hiç uğramaz. */
db = loadDB() || seedDBBlank();
// eski kayıtlarda eksik alan kalmasın
if(!db.stockLog) db.stockLog=[];
if(!db.dayHistory) db.dayHistory=[];
if(!db.cari) db.cari=[];
if(!db.floatChecks) db.floatChecks=[];
if(!db.expenses) db.expenses=[];
if(!db.stockCats) db.stockCats=[];
if(!db.menuCatList) db.menuCatList=[];
if(!db.nextCheckNo) db.nextCheckNo=1;
(db.stock||[]).forEach(s=>{ if(s.price===undefined) s.price=0; });
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
/* alkol stoğu artık adet + açık şişe cl'si olarak takip ediliyor (bkz. ui/js/stock.js),
   tek "Alkol" kategorisi Biralar/Şaraplar/Ağır Alkoller olarak üçe ayrıldı, ve gerçek
   şişe sayımı + geliş fiyatlarıyla dolduruldu (bkz. backend/seed.js ALKOL_SAYIM) —
   tek seferlik. Eşleşen kalemler id/isim korunarak yerinde güncellenir (reçeteler
   bozulmaz), fotoğrafta karşılığı olmayan markalar yeni kalem olarak eklenir. */
/* bu migration Azumare'nin kendi (menüden türetilmiş) alkol iskeletine göre yazıldı —
   başka bir restoranda (ör. FreshPress) aynı isimler hiç yoktur, o yüzden önce bu
   kurulumun gerçekten Azumare soyundan geldiği (menüsünde Azumare'ye özgü bir kalem
   varlığıyla) doğrulanır; değilse dokunulmadan sadece işaretlenip geçilir. */
if(!db.stockBottleTrackApplied && !db.menu.some(m=>m.name==="Gordon's Day Gin")){
  db.stockBottleTrackApplied=true;
}
if(!db.stockBottleTrackApplied){
  const freshAlk=seedDB().stock.filter(s=>['Biralar','Şaraplar','Ağır Alkoller'].includes(s.cat));
  freshAlk.forEach(fresh=>{
    const existing=db.stock.find(s=>s.name===fresh.name && (s.cat==='Alkol'||['Biralar','Şaraplar','Ağır Alkoller'].includes(s.cat)));
    if(existing){
      existing.cat=fresh.cat; existing.unit='adet'; existing.bottleCl=fresh.bottleCl;
      existing.low=fresh.low; existing.crit=fresh.crit;
      existing.qty=fresh.qty; existing.extraCl=fresh.extraCl; existing.price=fresh.price;
    }else{
      // seedDB()'nin kendi "alkNN" id sayacı bu kurulumun MEVCUT stok id'leriyle
      // hiç ilişkili değil (canlıda çok daha önce, farklı bir sayımla atanmış) —
      // çakışmayı önlemek için burada yeni, garanti benzersiz bir id üretilir
      db.stock.push({...fresh, id:uid()});
    }
  });
  // rakı markaları artık 35CL/70CL diye ayrı iki havuz (geliş fiyatı farklı olduğu
  // için) — eski tek-havuzlu kalemler (ör. "Tekirdağ Göbek") bu ayrımla yer değiştirdi.
  // Kadeh (4/6/8cl) satışı ve kokteyl malzemesi olarak kullanım hep 70CL havuzundan düşer.
  const oldRakiNames=['Tekirdağ Göbek','Beylerbeyi Göbek','Sarı Zeybek 3 Meşe','Yeni Rakı Yeni Seri','Yeni Rakı'];
  const oldRakiEntries=db.stock.filter(s=>s.cat==='Alkol' && oldRakiNames.includes(s.name));
  const rakiIdMap={}; // eski tek-havuz id -> yeni 70CL havuz id
  oldRakiEntries.forEach(old=>{
    const pool70=db.stock.find(s=>s.name===old.name+' 70CL');
    if(pool70) rakiIdMap[old.id]=pool70.id;
  });
  db.stock=db.stock.filter(s=>!(s.cat==='Alkol' && oldRakiNames.includes(s.name)));
  const rakiPoolId=(brand,cl)=>{
    const s=db.stock.find(x=>x.name===brand+' '+((cl===35||cl===70)?cl:70)+'CL');
    return s?s.id:null;
  };
  db.menu.forEach(m=>{
    if(m.cat==='Rakılar'){
      const mm=m.name.match(/^(.+) (\d+)cl$/i);
      if(mm){ const pid=rakiPoolId(mm[1],+mm[2]); if(pid) m.recipe=[{s:pid, q:+mm[2]}]; }
    }else{
      (m.recipe||[]).forEach(r=>{ if(rakiIdMap[r.s]) r.s=rakiIdMap[r.s]; });
    }
  });
  db.stockBottleTrackApplied=true;
}
/* soft içecekler gerçek sayımla dolduruldu (Cola/Fanta/Sprite artık ortak tek havuz);
   kokteyl/kahve malzemeleri de tat başına ayrı kalemler yerine tek "Şuruplar"/"Püreler"
   şişeli havuzuna toplandı (1 adet = 100cl). Sadece Azumare soyundan gelen kurulumlarda
   çalışır (bkz. stockBottleTrackApplied'daki aynı mantık) — tek seferlik. */
if(!db.stockIcecekKokteylMalzemeApplied && !db.menu.some(m=>m.name==="Gordon's Day Gin")){
  db.stockIcecekKokteylMalzemeApplied=true;
}
if(!db.stockIcecekKokteylMalzemeApplied){
  const mergeRecipe=recipe=>{
    const out=[];
    (recipe||[]).forEach(r=>{
      const ex=out.find(x=>x.s===r.s);
      if(ex) ex.q=+(ex.q+r.q).toFixed(3); else out.push({s:r.s, q:r.q});
    });
    return out;
  };
  // --- Cola/Fanta/Sprite: 3 ayrı kalem -> 1 ortak kalem ---
  const cfs=['Cola','Fanta','Sprite'].map(n=>db.stock.find(s=>s.cat==='İçecek' && s.name===n)).filter(Boolean);
  const cfsIdMap={};
  if(cfs.length){
    const survivor=cfs[0];
    cfs.forEach(s=>{ cfsIdMap[s.id]=survivor.id; });
    survivor.name='Cola,Fanta,Sprite'; survivor.qty=252; survivor.price=55;
    db.stock=db.stock.filter(s=>!(cfs.slice(1).some(x=>x.id===s.id)));
  }
  // --- diğer İçecek kalemleri: isimle eşleşenler yerinde güncellenir, yeni olanlar eklenir ---
  const freshIcecek=seedDB().stock.filter(s=>s.cat==='İçecek' && s.name!=='Cola,Fanta,Sprite');
  freshIcecek.forEach(fresh=>{
    const existing=db.stock.find(s=>s.cat==='İçecek' && s.name===fresh.name);
    if(existing){ existing.qty=fresh.qty; existing.price=fresh.price; }
    else db.stock.push({...fresh, id:uid()});
  });
  if(cfs.length){ const survivor=db.stock.find(s=>s.id===cfs[0].id); if(survivor){ survivor.qty=252; survivor.price=55; } }
  // --- kokteyl/kahve malzemeleri: 7 tat -> "Şuruplar"/"Püreler" iki ortak şişeli havuz ---
  const surupNames=['Şeker Şurubu','Karamel Şurubu','Vanilya Şurubu'];
  const pureNames=['Çarkıfelek Püresi','Çilek Püresi','Mango Püresi','Elma Püresi'];
  const oldMalzeme=db.stock.filter(s=>s.cat==='Kokteyl Malzemesi' && (surupNames.includes(s.name)||pureNames.includes(s.name)));
  const freshMalzeme=seedDB().stock.filter(s=>s.cat==='Kokteyl Malzemesi');
  const surupFresh=freshMalzeme.find(s=>s.name==='Şuruplar'), pureFresh=freshMalzeme.find(s=>s.name==='Püreler');
  let surupNew=db.stock.find(s=>s.cat==='Kokteyl Malzemesi' && s.name==='Şuruplar');
  let pureNew=db.stock.find(s=>s.cat==='Kokteyl Malzemesi' && s.name==='Püreler');
  if(!surupNew && surupFresh){ surupNew={...surupFresh, id:uid()}; db.stock.push(surupNew); }
  if(!pureNew && pureFresh){ pureNew={...pureFresh, id:uid()}; db.stock.push(pureNew); }
  if(surupNew && surupFresh){ surupNew.qty=surupFresh.qty; surupNew.extraCl=surupFresh.extraCl; surupNew.price=surupFresh.price; surupNew.bottleCl=surupFresh.bottleCl; surupNew.unit='adet'; }
  if(pureNew && pureFresh){ pureNew.qty=pureFresh.qty; pureNew.extraCl=pureFresh.extraCl; pureNew.price=pureFresh.price; pureNew.bottleCl=pureFresh.bottleCl; pureNew.unit='adet'; }
  const malzemeIdMap={};
  oldMalzeme.forEach(old=>{
    const target=surupNames.includes(old.name)?surupNew:pureNew;
    if(target) malzemeIdMap[old.id]=target.id;
  });
  db.stock=db.stock.filter(s=>!oldMalzeme.some(o=>o.id===s.id));
  // --- menüdeki tüm reçeteleri (Cola/Fanta/Sprite + şurup/püre) yeni id'lere yeniden bağla ---
  const idMap=Object.assign({}, cfsIdMap, malzemeIdMap);
  db.menu.forEach(m=>{
    m.recipe=mergeRecipe((m.recipe||[]).map(r=>idMap[r.s]?{s:idMap[r.s], q:r.q}:r));
    (m.variants||[]).forEach(v=>{ v.extra=mergeRecipe((v.extra||[]).map(r=>idMap[r.s]?{s:idMap[r.s], q:r.q}:r)); });
  });
  db.stockIcecekKokteylMalzemeApplied=true;
}
/* yeni "Temizlik Malzemeleri" kategorisi — menüyle/reçeteyle ilgisi yok, sadece envanter.
   Sadece Azumare soyundan gelen kurulumlarda çalışır (bkz. yukarıdaki aynı mantık) — tek seferlik. */
if(!db.stockTemizlikAdded && !db.menu.some(m=>m.name==="Gordon's Day Gin")){
  db.stockTemizlikAdded=true;
}
if(!db.stockTemizlikAdded){
  const freshTemizlik=seedDB().stock.filter(s=>s.cat==='Temizlik Malzemeleri');
  freshTemizlik.forEach(fresh=>{
    const existing=db.stock.find(s=>s.cat==='Temizlik Malzemeleri' && s.name===fresh.name);
    if(existing){ existing.qty=fresh.qty; existing.price=fresh.price; }
    else db.stock.push({...fresh, id:uid()});
  });
  db.stockTemizlikAdded=true;
}
/* "Şuruplar" kalemi ilk girişte yanlışlıkla Püreler ile aynı şişe boyutunda (100cl)
   kaydedilmişti — gerçekte Şuruplar 75cl'lik şişe. Sadece şişe boyutu düzeltilir,
   sayılan adet/açık şişe cl'si (fiziksel sayım) dokunulmadan kalır. Sadece Azumare
   soyundan gelen kurulumlarda çalışır (bkz. yukarıdaki aynı mantık) — tek seferlik. */
if(!db.stockSuruplarClFix && !db.menu.some(m=>m.name==="Gordon's Day Gin")){
  db.stockSuruplarClFix=true;
}
if(!db.stockSuruplarClFix){
  const s=db.stock.find(x=>x.cat==='Kokteyl Malzemesi' && x.name==='Şuruplar');
  if(s) s.bottleCl=75;
  db.stockSuruplarClFix=true;
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
// Alkolsüz Kokteyl kategorisi kaldırıldı, içindeki ürünler Soft İçecekler'e taşındı — tek seferlik
if(!db.alkolsuzKokteylMovedToSoft){
  db.menu.forEach(m=>{ if(m.cat==='Alkolsüz Kokteyl') m.cat='Soft İçecekler'; });
  db.alkolsuzKokteylMovedToSoft=true;
}
// Sangria isimleri netleştirildi (Ananas -> Ananaslı Sangria vb.) — tek seferlik
if(!db.sangriaNamesRenamed){
  const RENAME={'Ananas':'Ananaslı Sangria','Kavun':'Kavunlu Sangria','Çilek':'Çilekli Sangria','Şeftali':'Şeftalili Sangria'};
  db.menu.forEach(m=>{ if(m.cat==='Sangria' && RENAME[m.name]) m.name=RENAME[m.name]; });
  db.sangriaNamesRenamed=true;
}
// Mojito ve Alkolsüz Mojito'ya ekstra malzemesiz "Sade" seçeneği eklendi — tek seferlik
if(!db.mojitoSadeAdded){
  ['Mojito','Alkolsüz Mojito'].forEach(name=>{
    const dst=db.menu.find(m=>m.name===name);
    if(dst && dst.variants && !dst.variants.some(v=>v.label==='Sade')){
      dst.variants.unshift({label:'Sade', extra:[]});
    }
  });
  db.mojitoSadeAdded=true;
}
// stok takibi artık restorana özel bir ayar (db.settings.stockEnabled) — eskiden
// tek/paylaşılan bir koddu. Azumare şu an stok takibi kullanmadığını belirttiği
// için mevcut kurulumuna bir kerelik false uygulanır; yeni (boş) kurulumlar
// zaten seedDBBlank()'ten true ile başlar ve bu düzeltmeye hiç uğramaz.
if(!db.settings) db.settings={stockEnabled:true};
if(!db.stockSettingApplied){
  db.settings.stockEnabled=false;
  db.stockSettingApplied=true;
}
// uzaktan sipariş girişi de restorana özel bir ayar (db.settings.remoteOrderingEnabled) —
// varsayılan kapalı, isteyen restoran Kullanıcılar > Ayarlar'dan kendi açar.
if(db.settings.remoteOrderingEnabled===undefined) db.settings.remoteOrderingEnabled=false;
// yönetici (patron/admin) uzaktan tam erişimi eskiden remoteOrderingEnabled ile
// BİRLİKTE aynı anahtardı; artık garson sipariş girişinden bağımsız, ayrı bir
// ayar (bir restoran garsonu kapalı tutup sadece yöneticiye tam erişim
// verebilsin, ya da tam tersi). Bu ayarı daha önce hiç görmemiş bir kurulum,
// eski tek-anahtarlı davranışını kaybetmesin diye eski değerini devralır —
// remoteOrderingEnabled zaten açıksa (ör. FreshPress) yönetici de açık
// başlar; hiç açılmamışsa (ör. Azumare) o da kapalı kalır.
if(db.settings.remoteAdminFullAccess===undefined) db.settings.remoteAdminFullAccess=!!db.settings.remoteOrderingEnabled;
// fişteki işletme adı da restorana özel bir ayar (db.settings.businessName) —
// eskiden kodda sabit "Azumare Lounge" yazıyordu. Bunu daha önce hiç
// görmemiş HERHANGİ bir kurulum (Azumare dahil FreshPress de), o ana kadar
// zaten fişte basılı olan ismi (Azumare Lounge) bir kerelik devralır — hiçbir
// restoranın fişi görünürde değişmez; her restoran Kullanıcılar > Ayarlar'dan
// kendi adını girip değiştirebilir.
if(db.settings.businessName===undefined) db.settings.businessName='Azumare Lounge';
initSync();
if(typeof tryReconnectPrinter==='function') tryReconnectPrinter();
remoteResume().then(resumed=>{
  if(!resumed){ saveDB(); render(); }
});

setInterval(()=>{ if(user && (view==='tables') && !$('#modalWrap').classList.contains('show')) render(); }, 60000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
$('#modalWrap').addEventListener('click', e=>{ if(e.target.id==='modalWrap') closeModal(); });
window.onafterprint=()=>{ $('#printArea').innerHTML=''; };
