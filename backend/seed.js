'use strict';
function seedDB(){
  /* menü satırları: [isim, kategori, TL fiyatı] */
  const MENU_ROWS = [
    ['Balık Çorbası','Çorba',620],
    ['Cunda Ezme','Soğuk Mezeler',520],['Biber Tatari','Soğuk Mezeler',480],['Girit Ezme','Soğuk Mezeler',640],
    ['Köz Patlıcan Tulum Peyniri Taze Ceviz','Soğuk Mezeler',580],['Yoğurtlu Semizotu','Soğuk Mezeler',520],
    ['Domatesli Biber Boranı','Soğuk Mezeler',520],['Avokadolu Kuru Cacık Nane Pesto','Soğuk Mezeler',560],
    ['Greek Salata','Salatalar',680],['Roka Marul Salatası','Salatalar',640],['Domates Salatası','Salatalar',760],['Sezar Salata','Salatalar',1140],
    ['Patates Cips','Ara Sıcaklar',400],['Taze Patates','Ara Sıcaklar',620],['Karides Manti','Ara Sıcaklar',880],
    ['Pastırmalı Humus','Ara Sıcaklar',780],['Yoğurtlu Karides Çıtır Yufka','Ara Sıcaklar',980],['Anasonlu Dil Balığı','Ara Sıcaklar',1400],
    ['Baklava Köfte','Ara Sıcaklar',670],['Kalamar Tava','Ara Sıcaklar',960],['Karides Tava','Ara Sıcaklar',960],
    ['Saganaki','Ara Sıcaklar',820],['Köz Patlıcanlı Ahtapot','Ara Sıcaklar',2100],
    ['Pizza Carpaccio','Başlangıçlar',1120],['Pizza Margherita','Başlangıçlar',760],['Et Burger','Başlangıçlar',820],
    ['Tavuk Burger','Başlangıçlar',720],['Parmesanlı Çıtır Tavuk','Başlangıçlar',650],['Pizza 3 Peynirli','Başlangıçlar',820],
    ["Ekşi Maya Köy Ekmeği & Kırma Zeytin",'Başlangıçlar',340],['Sarımsaklı Ekmek','Başlangıçlar',520],
    ['Levrek Izgara','Deniz Ürünleri',2200],['Çipura Tava','Deniz Ürünleri',1900],['Midye Mariniera','Deniz Ürünleri',1240],
    ['Sebzeli Dil Balığı','Deniz Ürünleri',2300],['Somon Izgara','Deniz Ürünleri',2000],
    ['Rakı Peyniri','Peynir & Soğuk Tabaklar',820],['Şarap Peyniri','Peynir & Soğuk Tabaklar',1140],
    ['Dana Carpaccio','Peynir & Soğuk Tabaklar',1020],['Gavurdağı Levrek Tartar','Peynir & Soğuk Tabaklar',1170],
    ['Ahtapot Tartar','Peynir & Soğuk Tabaklar',1440],['Somon Rillettes','Peynir & Soğuk Tabaklar',1120],
    ['Dana Bonfile','Ana Yemekler',2100],['Alevde Bonfile','Ana Yemekler',1900],['Yoğurtlu Köfte','Ana Yemekler',1450],
    ['Çökertme Kebab','Ana Yemekler',1640],['Karidesli Spaghetti','Ana Yemekler',1160],['Fettuccine','Ana Yemekler',1160],['Somonlu Penne','Ana Yemekler',1110],
    ['Profiterol','Tatlılar',660],['Lor, Vişne ve Kırık Fındık','Tatlılar',540],['Dondurma','Tatlılar',200],
    ['Dondurmalı Sufle','Tatlılar',640],['Mevsim Meyveleri','Tatlılar',1000],
    ["Gordon's Day Gin",'Gin',750],["Gordon's Premium Pink",'Gin',750],['Tanqueray No Ten','Gin',900],
    ['Tanqueray London Dry Gin','Gin',850],['Tanqueray Flor De Sevilla','Gin',1100],['Gin Mare Mediterranean','Gin',1100],['Monkey 47','Gin',1100],
    ['J&B 225','Whiskey',825],['Johnnie Walker Black Label','Whiskey',830],['Johnnie Walker Red Label','Whiskey',825],
    ['Johnnie Walker Gold Label','Whiskey',1000],['Johnie Walker Double Black','Whiskey',1250],['Johnie Walker Blue Label','Whiskey',1750],
    ['Dimple Golden Selection','Whiskey',1050],['The Singleton of Dufftown 15 YO','Whiskey',1200],
    ["Jack Daniel's",'Whiskey',825],['Gentleman Jack','Whiskey',1000],['Bulleit Bourbon','Whiskey',1050],
    ['Captain Morgan White','Rom',750],['Captain Morgan Gold','Rom',825],
    ['Efes 50cl','Biralar',350],['Efes Malt 50cl','Biralar',350],['Bomonti Filtresiz 50cl','Biralar',350],
    ['Erdinger 33cl','Biralar',475],['Miller 33cl','Biralar',475],['Becks 33cl','Biralar',475],
    ['Heineken 33cl','Biralar',475],['Bud 33cl','Biralar',475],['Corona 33cl','Biralar',475],['Paul Weissbier','Biralar',530],
    ['Smirnoff 750','Vodka',750],['Smirnoff North','Vodka',900],['Ciroc Vodka','Vodka',950],
    ['Azumare Special','İmza Kokteyller',750],['Azumare Passion','İmza Kokteyller',750],['Azumare Chilli Passion','İmza Kokteyller',750],
    ['Chilli Negroni','İmza Kokteyller',750],['NO1','İmza Kokteyller',750],['Aperol Margarita','İmza Kokteyller',750],['Azumare Refresh','İmza Kokteyller',750],
    ['Lynchburg Lemonade','Classic Kokteyl',750],['Margarita','Classic Kokteyl',750],['Mojito','Classic Kokteyl',750],
    ['Caipirinha','Classic Kokteyl',750],['Whiskey Sour','Classic Kokteyl',750],['Moscow Mule','Classic Kokteyl',750],
    ['Negroni','Classic Kokteyl',750],['Aperol Spritz','Classic Kokteyl',750],['Espresso Martini','Classic Kokteyl',750],
    ['Pornstar Martini','Classic Kokteyl',750],['Long Island Iced Tea','Classic Kokteyl',750],
    ['Ananas','Sangria',2450],['Kavun','Sangria',2450],['Çilek','Sangria',2450],['Şeftali','Sangria',2450],
    ['Sunset (Şişe 1LT)','Şişe Kokteyl',2500],['Azumare Refresh (Şişe 1LT)','Şişe Kokteyl',2500],
    ['Long Island Ice Tea (Şişe 1LT)','Şişe Kokteyl',2750],['Lyncburg Lemonade (Şişe 1LT)','Şişe Kokteyl',2750],
    ['Beyaz Şarap (Pinot Grigio)','Kadeh Şaraplar',450],['Kırmızı Şarap (Pasqua Merlot)','Kadeh Şaraplar',450],
    ['Roze Şarap (Pinot Grigio Rose)','Kadeh Şaraplar',450],['Prosecco','Kadeh Şaraplar',600],
    ['Espresso','Soft İçecekler',250],['Americano','Soft İçecekler',250],['Cappuccino','Soft İçecekler',300],['Latte','Soft İçecekler',300],
    ['Ice Latte','Soft İçecekler',400],['Çay','Soft İçecekler',150],['Türk Kahvesi','Soft İçecekler',200],
    ['Cola','Soft İçecekler',250],['Fanta','Soft İçecekler',250],['Sprite','Soft İçecekler',250],['Redbull','Soft İçecekler',325],
    ['S. Pelegrino 25cl','Soft İçecekler',200],['S. Pelegrino 70cl','Soft İçecekler',475],
    ['Su 330ml','Soft İçecekler',100],['Su 750ml','Soft İçecekler',150],['Soda','Soft İçecekler',150],['Churchill','Soft İçecekler',170],
    ['Alkolsüz Kokteyl','Soft İçecekler',500],
    ['Layd Killer','Nargile',1000],['Love 66','Nargile',1000],['Pişmiş Şeftali','Nargile',1000],
    ['Double Apple','Nargile',1000],['Nikotin İçermeyen','Nargile',1000],
    ['Azumare Special Fresh','Nargile',1500],['Azumare Special Tropical','Nargile',1500],
    ['Tekirdağ Göbek 35cl','Rakılar',2150],['Tekirdağ Göbek 70cl','Rakılar',3850],
    ['Beylerbeyi Göbek 35cl','Rakılar',2150],['Beylerbeyi Göbek 70cl','Rakılar',3850],
    ['Sarı Zeybek 3 Meşe 35cl','Rakılar',2255],['Sarı Zeybek 3 Meşe 70cl','Rakılar',3960],
    ['Yeni Rakı Yeni Seri 35cl','Rakılar',1890],['Yeni Rakı Yeni Seri 70cl','Rakılar',2970],
    ['Tekirdağ Göbek 4cl','Rakılar',300],['Tekirdağ Göbek 6cl','Rakılar',420],['Tekirdağ Göbek 8cl','Rakılar',500],
    ['Beylerbeyi Göbek 4cl','Rakılar',300],['Beylerbeyi Göbek 6cl','Rakılar',420],['Beylerbeyi Göbek 8cl','Rakılar',500],
    ['Sarı Zeybek 3 Meşe 4cl','Rakılar',325],['Sarı Zeybek 3 Meşe 6cl','Rakılar',460],['Sarı Zeybek 3 Meşe 8cl','Rakılar',550],
    ['Yeni Rakı Yeni Seri 4cl','Rakılar',285],['Yeni Rakı Yeni Seri 6cl','Rakılar',400],['Yeni Rakı Yeni Seri 8cl','Rakılar',480],
    ['Moet Brut Imperial','Şampanyalar',7750],['Moet Ice Imperial','Şampanyalar',10500],['Moet n.i.r Nectar','Şampanyalar',12450],
    ['Louis Roederer Collection','Şampanyalar',10780],['Luc Belaire','Şampanyalar',3000],['Luc Belaire Rose','Şampanyalar',3500],
    ['Chandon Garden Spritz','Şampanyalar',3100],
    ['Studio Miraval','Rose Şaraplar',4700],['Miraval Provence','Rose Şaraplar',6250],['Felici Rose','Rose Şaraplar',4000],
    ['Pinot Grigio Rose','Rose Şaraplar',2400],['Umurbey Blush','Rose Şaraplar',2800],['Porta Diverti Rose','Rose Şaraplar',3000],
    ['Likya Fox','Rose Şaraplar',2600],['Whispering Angel','Rose Şaraplar',4200],['Roseblood','Rose Şaraplar',4800],
    ['Porta Caeli','Kırmızı Yerli Şaraplar',8350],['Ament Blend','Kırmızı Yerli Şaraplar',6000],['Ament Cabernet Sauvignon','Kırmızı Yerli Şaraplar',6000],
    ['Porta Diverti Merlot','Kırmızı Yerli Şaraplar',3000],['Umurbey Cabernet','Kırmızı Yerli Şaraplar',2800],['Urla Tempus','Kırmızı Yerli Şaraplar',5150],
    ['Urla Vourla','Kırmızı Yerli Şaraplar',4800],["Chamlija Nev'i Şahsına Münhasır",'Kırmızı Yerli Şaraplar',6600],['Likya Opramoas','Kırmızı Yerli Şaraplar',4800],
    ['Likya Acıkara','Kırmızı Yerli Şaraplar',4500],['Prodom Syrah Petit Verdot Cab. Franc','Kırmızı Yerli Şaraplar',3000],
    ['Pasqua Merlot','Kırmızı Yerli Şaraplar',2400],['Urla Geminus','Kırmızı Yerli Şaraplar',5800],
    ['Bad Boy Bordeaux Blend','Kırmızı İtal Şaraplar',4750],['Viña Collada Rioja','Kırmızı İtal Şaraplar',5190],
    ['Covinus Enterino Grand Reserve','Kırmızı İtal Şaraplar',4925],['Nipozzano','Kırmızı İtal Şaraplar',3500],
    ['Bindi Sergardi Chianti','Kırmızı İtal Şaraplar',2750],['Château Haut-Reys Graves','Kırmızı İtal Şaraplar',3400],
    ["Barolo Serralunga d'Alba",'Kırmızı İtal Şaraplar',3900],['Clarendelle Bordeaux','Kırmızı İtal Şaraplar',4200],
    ['Marqués de Riscal Rioja Reserve','Kırmızı İtal Şaraplar',4600],['Famille Perrin Côtes du Rhône','Kırmızı İtal Şaraplar',3350],
    ['Il Pino di Biserno','Kırmızı İtal Şaraplar',8000],['Juan Hús Cariñena','Kırmızı İtal Şaraplar',3450],
    ['Pacem Barrel Sauvignon Blanc','Beyaz Yerli Şaraplar',4650],['Pacem Sauvignon Blanc','Beyaz Yerli Şaraplar',4050],
    ['Umurbey Sauvignon Blanc','Beyaz Yerli Şaraplar',2800],['7 Bilgeler Khilon Sauvignon Blanc','Beyaz Yerli Şaraplar',3500],
    ['7 Bilgeler Anaxagoras','Beyaz Yerli Şaraplar',3500],['Prodom Sauvignon Blanc','Beyaz Yerli Şaraplar',3250],
    ['Prodom Late Harvest Misket','Beyaz Yerli Şaraplar',4000],['Likya Narince','Beyaz Yerli Şaraplar',2800],
    ['Pinot Grigio','Beyaz Yerli Şaraplar',2400],['Urla Chardonnay','Beyaz Yerli Şaraplar',4800],['Urla Sauvignon Blanc','Beyaz Yerli Şaraplar',4800],
    ['Château Tracy – Pouilly Fumé','Beyaz İtal Şaraplar',7900],['Mille 951 – Gavi','Beyaz İtal Şaraplar',5800],
    ['Terras Gauda Albariño','Beyaz İtal Şaraplar',6650],['Wheinhaus Ress Riesling','Beyaz İtal Şaraplar',4050],
    ['Domaine Gobelsburg Riesling','Beyaz İtal Şaraplar',2550],['Broglia – Gavi','Beyaz İtal Şaraplar',6600],
    ['Cloudy Bay Sauvignon Blanc','Beyaz İtal Şaraplar',5400],['Domaine Louis Moreau "Chablis" AOC','Beyaz İtal Şaraplar',4500]
  ];

  /* ---------- alkol stok havuzları ----------
     Her marka için TEK bir cl havuzu var; o markanın şişe satışı, kadeh satışı
     ve içinde geçtiği her kokteyl aynı havuzdan düşer. Şişe/kadeh kategorilerindeki
     markalar menü satırlarından otomatik türetilir (isim eşleşmesiyle karışıklık
     olmasın diye), sadece menüde tek başına satılmayan likörler ve Prosecco elle eklenir.
  */
  let alkId=0; const nid=()=>'alk'+(++alkId);
  const BOTTLE_CATS=['Şampanyalar','Rose Şaraplar','Kırmızı Yerli Şaraplar','Kırmızı İtal Şaraplar','Beyaz Yerli Şaraplar','Beyaz İtal Şaraplar'];
  const KADEH_SPIRIT_CATS=['Gin','Whiskey','Rom','Vodka'];
  const alkStock=[];
  MENU_ROWS.forEach(([name,cat])=>{
    if(BOTTLE_CATS.includes(cat)) alkStock.push({id:nid(),name,cat:'Alkol',qty:1000,unit:'cl',low:150,crit:75});
    else if(KADEH_SPIRIT_CATS.includes(cat)) alkStock.push({id:nid(),name,cat:'Alkol',qty:1000,unit:'cl',low:140,crit:70});
    else if(cat==='Biralar') alkStock.push({id:nid(),name,cat:'Alkol',qty:100,unit:'adet',low:24,crit:6});
  });

  const rakiBrands=[...new Set(MENU_ROWS.filter(r=>r[1]==='Rakılar').map(r=>r[0].match(/^(.+) \d+cl$/)[1]))];
  rakiBrands.forEach(name=>alkStock.push({id:nid(),name,cat:'Alkol',qty:1000,unit:'cl',low:140,crit:70}));

  ['Prosecco','Don Julio','Havana Club','Garrone Triple Sec','Garrone Rosso','Martini Rosso','Campari','Amaretto','Kahlua','Aperol']
    .forEach(name=>alkStock.push({id:nid(),name,cat:'Alkol',qty:1000,unit:'cl',low:100,crit:40}));

  const stock=[...alkStock];
  const sid=n=>{ const s=stock.find(x=>x.name===n); if(!s) throw new Error('alkol stoğu bulunamadı: '+n); return s.id; };

  /* ---------- kokteyl / kadeh reçeteleri (backend'e özel, kullanıcı görmez) ---------- */
  const RCP={
    // kadeh şaraplar
    'Beyaz Şarap (Pinot Grigio)':     [[sid('Pinot Grigio'),22]],
    'Kırmızı Şarap (Pasqua Merlot)':  [[sid('Pasqua Merlot'),22]],
    'Roze Şarap (Pinot Grigio Rose)': [[sid('Pinot Grigio Rose'),22]],
    'Prosecco':                       [[sid('Prosecco'),22]],
    // imza kokteyller
    'Azumare Special':       [[sid("Gordon's Day Gin"),5],[sid('Garrone Triple Sec'),2]],
    'Azumare Passion':       [[sid('Yeni Rakı Yeni Seri'),4]],
    'Azumare Chilli Passion':[[sid('Don Julio'),5],[sid('Garrone Triple Sec'),2]],
    'Chilli Negroni':        [[sid("Gordon's Day Gin"),5],[sid('Martini Rosso'),2],[sid('Campari'),2]],
    'NO1':                   [[sid('J&B 225'),5],[sid('Amaretto'),2]],
    'Aperol Margarita':      [[sid('Aperol'),2],[sid('Don Julio'),4]],
    'Azumare Refresh':       [[sid("Gordon's Day Gin"),5]],
    // classic / universal kokteyl
    'Lynchburg Lemonade':    [[sid('J&B 225'),5],[sid('Garrone Triple Sec'),2]],
    'Margarita':             [[sid('Don Julio'),5],[sid('Garrone Triple Sec'),2]],
    'Mojito':                [[sid('Captain Morgan White'),5]],
    'Caipirinha':            [[sid('Captain Morgan White'),5]],
    'Whiskey Sour':          [[sid('J&B 225'),5],[sid('Garrone Triple Sec'),2]],
    'Moscow Mule':           [[sid('Smirnoff 750'),5]],
    'Negroni':               [[sid('Campari'),2],[sid("Gordon's Day Gin"),5],[sid('Garrone Triple Sec'),2],[sid('Garrone Rosso'),2]],
    'Aperol Spritz':         [[sid('Aperol'),5],[sid('Prosecco'),10]],
    'Espresso Martini':      [[sid('Smirnoff 750'),5],[sid('Kahlua'),2]],
    'Pornstar Martini':      [[sid('Smirnoff 750'),5],[sid('Prosecco'),5]],
    'Long Island Iced Tea':  [[sid('Smirnoff 750'),2],[sid("Gordon's Day Gin"),2],[sid('Havana Club'),2],[sid('Don Julio'),1],[sid('Garrone Triple Sec'),1]],
    // sangria (4 lezzet de aynı reçete)
    'Ananas':  [[sid("Gordon's Day Gin"),20],[sid('Pinot Grigio'),25],[sid('Pinot Grigio Rose'),25]],
    'Kavun':   [[sid("Gordon's Day Gin"),20],[sid('Pinot Grigio'),25],[sid('Pinot Grigio Rose'),25]],
    'Çilek':   [[sid("Gordon's Day Gin"),20],[sid('Pinot Grigio'),25],[sid('Pinot Grigio Rose'),25]],
    'Şeftali': [[sid("Gordon's Day Gin"),20],[sid('Pinot Grigio'),25],[sid('Pinot Grigio Rose'),25]],
    // şişe kokteyl (1LT = 4 porsiyon, tek porsiyon reçetesinin 4 katı). Sunset reçetesi henüz belirlenmedi.
    'Azumare Refresh (Şişe 1LT)':     [[sid("Gordon's Day Gin"),20]],
    'Long Island Ice Tea (Şişe 1LT)': [[sid('Smirnoff 750'),8],[sid("Gordon's Day Gin"),8],[sid('Havana Club'),8],[sid('Don Julio'),4],[sid('Garrone Triple Sec'),4]],
    'Lyncburg Lemonade (Şişe 1LT)':   [[sid('J&B 225'),20],[sid('Garrone Triple Sec'),8]]
  };

  const menu=MENU_ROWS.map(([name,cat,tl],i)=>{
    let recipe=RCP[name];
    if(!recipe){
      if(cat==='Rakılar'){
        const m=name.match(/^(.+) (\d+)cl$/);
        if(m) recipe=[[sid(m[1]),+m[2]]];
      } else if(KADEH_SPIRIT_CATS.includes(cat)){
        recipe=[[sid(name),5]];
      } else if(BOTTLE_CATS.includes(cat)){
        recipe=[[sid(name),75]];
      } else if(cat==='Biralar'){
        recipe=[[sid(name),1]];
      }
    }
    return {id:'m'+(i+1), name, cat, price:{TL:tl,USD:0,EUR:0}, recipe:(recipe||[]).map(([s,q])=>({s,q}))};
  });

  return {
    users:[
      {id:'u1',username:'admin',   pass:'1234',name:'Admin Kullanıcı', role:'admin'},
      {id:'u2',username:'garson',  pass:'1234',name:'Ahmet',           role:'garson'},
      {id:'u3',username:'depo',    pass:'1234',name:'Depo Sorumlusu',  role:'depo'},
      {id:'u4',username:'muhasebe',pass:'1234',name:'Muhasebe',        role:'muhasebe'}
    ],
    rates:{USD:47.01, EUR:53.58, updatedAt:null},
    stock,
    menu,
    tables: [
      'Teras 1','Teras 2','Teras 3','Teras 4','Teras 5','Teras 6','Teras 7','Teras 8','Teras 9',
      'İncir Altı 1','İncir Altı 2',
      'L Koltuk',
      'Bahçe 1','Bahçe 2',
      'Bambu 1','Bambu 2',
      'Arka Bahçe 1','Arka Bahçe 2','Arka Bahçe 3','Arka Bahçe 4',
      'Taş Masa',
      'Sahil 1','Sahil 2','Sahil 3','Sahil 4'
    ].map((name,i)=>({
      id:'t'+(i+1), name, customName:null, status:'empty',
      currency:null, openedAt:null, openedBy:null, items:[], discount:null, service:null, complimentary:null
    })),
    sales:[],
    cari:[],
    stockLog:[],
    day:{open:false, date:null, openingFloat:0, openedAt:null, openedBy:null, lastNextFloat:0},
    dayHistory:[],
    floatChecks:[]
  };
}
