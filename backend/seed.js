'use strict';
function seedDB(){
 
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
    ['Lynchburg Lemonade','Classic Kokteyl',750],['Margarita','Classic Kokteyl',750],
    ['Mojito','Classic Kokteyl',750],
    ['Caipirinha','Classic Kokteyl',750],['Whiskey Sour','Classic Kokteyl',750],['Moscow Mule','Classic Kokteyl',750],
    ['Negroni','Classic Kokteyl',750],['Aperol Spritz','Classic Kokteyl',750],['Espresso Martini','Classic Kokteyl',750],
    ['Pornstar Martini','Classic Kokteyl',750],['Long Island Iced Tea','Classic Kokteyl',750],
    ['Ananaslı Sangria','Sangria',2450],['Kavunlu Sangria','Sangria',2450],['Çilekli Sangria','Sangria',2450],['Şeftalili Sangria','Sangria',2450],
    ['Sunset (Şişe 1LT)','Şişe Kokteyl',2500],['Azumare Refresh (Şişe 1LT)','Şişe Kokteyl',2500],
    ['Long Island Ice Tea (Şişe 1LT)','Şişe Kokteyl',2750],['Lyncburg Lemonade (Şişe 1LT)','Şişe Kokteyl',2750],
    ['Beyaz Şarap (Pinot Grigio)','Kadeh Şaraplar',450],['Kırmızı Şarap (Pasqua Merlot)','Kadeh Şaraplar',450],
    ['Roze Şarap (Pinot Grigio Rose)','Kadeh Şaraplar',450],['Prosecco','Kadeh Şaraplar',600],
    ['Espresso','Soft İçecekler',250],['Americano','Soft İçecekler',250],['Cappuccino','Soft İçecekler',300],['Latte','Soft İçecekler',300],
    ['Ice Latte','Soft İçecekler',400],
    ['Çay','Soft İçecekler',150],['Türk Kahvesi','Soft İçecekler',200],
    ['Cola','Soft İçecekler',250],['Fanta','Soft İçecekler',250],['Sprite','Soft İçecekler',250],['Redbull','Soft İçecekler',325],
    ['S. Pelegrino 25cl','Soft İçecekler',200],['S. Pelegrino 70cl','Soft İçecekler',475],
    ['Su 330ml','Soft İçecekler',100],['Su 750ml','Soft İçecekler',150],['Soda','Soft İçecekler',150],['Churchill','Soft İçecekler',170],
    ['Azumare Sunset','Soft İçecekler',500],['Alkolsüz Mojito','Soft İçecekler',500],
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
     Her marka için TEK bir şişeli takip havuzu var (adet + açık şişede kalan cl,
     bkz. STOCK bottleCl/extraCl — ui/js/stock.js); o markanın şişe satışı, kadeh
     satışı ve içinde geçtiği her kokteyl aynı havuzdan (toplam cl) düşer. Şişe/kadeh
     kategorilerindeki markalar menü satırlarından otomatik türetilir (isim eşleşmesiyle
     karışıklık olmasın diye), sadece menüde tek başına satılmayan likörler ve Prosecco
     elle eklenir. Kategoriler: Biralar / Şaraplar / Ağır Alkoller.
     Gerçek şişe sayımı + geliş fiyatları ALKOL_SAYIM altında, marka adına göre eşleşerek
     uygulanır (reçetelerin baktığı stok id/isim hiç değişmez); fotoğrafta karşılığı
     olmayan markalarda geçmişteki gibi 0'dan başlar. */
  let alkId=0; const nid=()=>'alk'+(++alkId);
  const BOTTLE_CATS=['Şampanyalar','Rose Şaraplar','Kırmızı Yerli Şaraplar','Kırmızı İtal Şaraplar','Beyaz Yerli Şaraplar','Beyaz İtal Şaraplar'];
  const KADEH_SPIRIT_CATS=['Gin','Whiskey','Rom','Vodka'];
  const alkStock=[];
  MENU_ROWS.forEach(([name,cat])=>{
    if(BOTTLE_CATS.includes(cat)) alkStock.push({id:nid(),name,cat:'Şaraplar',qty:0,unit:'adet',bottleCl:75,extraCl:0,price:0,low:150,crit:75});
    else if(KADEH_SPIRIT_CATS.includes(cat)) alkStock.push({id:nid(),name,cat:'Ağır Alkoller',qty:0,unit:'adet',bottleCl:70,extraCl:0,price:0,low:140,crit:70});
    else if(cat==='Biralar'){
      const m=name.match(/(\d+)\s*cl$/i); const bcl=m?+m[1]:33;
      alkStock.push({id:nid(),name,cat:'Biralar',qty:0,unit:'adet',bottleCl:bcl,extraCl:0,price:0,low:24*bcl,crit:6*bcl});
    }
  });

  /* rakı: 35cl ve 70cl şişelerin geliş fiyatı birbirinden farklı olduğu için her marka
     İKİ AYRI havuz olarak tutulur (35CL / 70CL); kadeh (4/6/8cl) satışları/kokteyl
     malzemesi olarak kullanımı ise her zaman 70CL havuzundan düşer — bkz. aşağıdaki
     rakiPool() ve menü reçetesi üretimi. */
  const rakiBrands=[...new Set(MENU_ROWS.filter(r=>r[1]==='Rakılar').map(r=>r[0].match(/^(.+) \d+cl$/)[1]))];
  const rakiPool=(brand,cl)=> brand+' '+((cl===35||cl===70)?cl:70)+'CL';
  rakiBrands.forEach(name=>{
    alkStock.push({id:nid(),name:name+' 70CL',cat:'Ağır Alkoller',qty:0,unit:'adet',bottleCl:70,extraCl:0,price:0,low:140,crit:70});
    alkStock.push({id:nid(),name:name+' 35CL',cat:'Ağır Alkoller',qty:0,unit:'adet',bottleCl:35,extraCl:0,price:0,low:70,crit:35});
  });

  alkStock.push({id:nid(),name:'Prosecco',cat:'Şaraplar',qty:0,unit:'adet',bottleCl:75,extraCl:0,price:0,low:150,crit:75});
  ['Don Julio','Havana Club','Garrone Triple Sec','Garrone Rosso','Martini Rosso','Campari','Amaretto','Kahlua','Aperol']
    .forEach(name=>alkStock.push({id:nid(),name,cat:'Ağır Alkoller',qty:0,unit:'adet',bottleCl:70,extraCl:0,price:0,low:140,crit:70}));

  /* ---------- gerçek şişe sayımı (fiziksel depo sayımı, TL geliş fiyatlarıyla) ----------
     Mevcut markalarda cat/unit/bottleCl zaten yukarıda doğru atandı; burada sadece
     qty/extraCl/price gerçek sayımla güncelleniyor. Fotoğrafta karşılığı bulunamayan
     markalar 0'da kalır (daha önce de öyleydi), kullanıcı Stok Durumu'ndan tamamlayabilir. */
  const ALKOL_SAYIM={
    'Erdinger 33cl':{qty:3,extraCl:0,price:175}, 'Corona 33cl':{qty:34,extraCl:0,price:152},
    'Bud 33cl':{qty:36,extraCl:0,price:106}, 'Miller 33cl':{qty:20,extraCl:0,price:120},
    'Becks 33cl':{qty:23,extraCl:0,price:120}, 'Heineken 33cl':{qty:23,extraCl:0,price:135},
    'Efes Malt 50cl':{qty:72,extraCl:0,price:106}, 'Efes 50cl':{qty:93,extraCl:0,price:128},
    'Bomonti Filtresiz 50cl':{qty:85,extraCl:0,price:118},

    'Umurbey Blush':{qty:14,extraCl:0,price:450}, 'Umurbey Sauvignon Blanc':{qty:1,extraCl:0,price:450},
    'Umurbey Cabernet':{qty:1,extraCl:0,price:450}, 'Urla Chardonnay':{qty:1,extraCl:0,price:0},
    'Urla Geminus':{qty:0,extraCl:0,price:1850}, 'Urla Sauvignon Blanc':{qty:1,extraCl:0,price:1300},
    'Urla Tempus':{qty:0,extraCl:0,price:1573}, 'Urla Vourla':{qty:2,extraCl:0,price:1055},
    'Chandon Garden Spritz':{qty:10,extraCl:0,price:763}, 'Porta Diverti Merlot':{qty:11,extraCl:0,price:1200},
    'Porta Diverti Rose':{qty:1,extraCl:0,price:988}, 'Likya Fox':{qty:1,extraCl:0,price:585},
    'Whispering Angel':{qty:1,extraCl:0,price:1800}, 'Roseblood':{qty:4,extraCl:0,price:2100},
    'Likya Opramoas':{qty:6,extraCl:0,price:1458}, 'Likya Narince':{qty:12,extraCl:0,price:900},
    'Pasqua Merlot':{qty:47,extraCl:0,price:480}, 'Pinot Grigio':{qty:53,extraCl:0,price:480},
    'Pinot Grigio Rose':{qty:47,extraCl:0,price:480}, 'Clarendelle Bordeaux':{qty:1,extraCl:0,price:1500},
    'Viña Collada Rioja':{qty:1,extraCl:0,price:850}, 'Château Haut-Reys Graves':{qty:2,extraCl:0,price:1200},
    'Marqués de Riscal Rioja Reserve':{qty:2,extraCl:0,price:1400}, 'Famille Perrin Côtes du Rhône':{qty:1,extraCl:0,price:1100},
    'Il Pino di Biserno':{qty:1,extraCl:0,price:3650}, 'Juan Hús Cariñena':{qty:1,extraCl:0,price:1150},
    '7 Bilgeler Anaxagoras':{qty:0,extraCl:0,price:1033}, '7 Bilgeler Khilon Sauvignon Blanc':{qty:0,extraCl:0,price:1033},
    'Wheinhaus Ress Riesling':{qty:3,extraCl:0,price:780}, 'Miraval Provence':{qty:3,extraCl:0,price:2300},

    'Kahlua':{qty:0,extraCl:40,price:1500,bottleCl:100}, 'Campari':{qty:0,extraCl:60,price:0,bottleCl:100},
    'Aperol':{qty:2,extraCl:80,price:1953,bottleCl:100}, 'Garrone Triple Sec':{qty:1,extraCl:35,price:1270,bottleCl:100},
    'Gin Mare Mediterranean':{qty:0,extraCl:12,price:2250}, "Jack Daniel's":{qty:0,extraCl:20,price:1446},
    'Johnnie Walker Black Label':{qty:3,extraCl:45,price:1600},
    'Johnnie Walker Red Label':{qty:2,extraCl:0,price:1250}, 'Johnnie Walker Gold Label':{qty:1,extraCl:55,price:2700},
    'Johnie Walker Double Black':{qty:1,extraCl:20,price:1600}, 'Johnie Walker Blue Label':{qty:2,extraCl:0,price:10350},
    'Martini Rosso':{qty:0,extraCl:20,price:1200}, 'Gentleman Jack':{qty:0,extraCl:50,price:1300},
    "Gordon's Premium Pink":{qty:2,extraCl:30,price:1152}, "Gordon's Day Gin":{qty:2,extraCl:30,price:1152},
    'Tanqueray No Ten':{qty:1,extraCl:60,price:2280}, 'Tanqueray Flor De Sevilla':{qty:2,extraCl:0,price:1725},
    'Tanqueray London Dry Gin':{qty:1,extraCl:0,price:1635},
    'Captain Morgan White':{qty:0,extraCl:12,price:1300}, 'Captain Morgan Gold':{qty:2,extraCl:0,price:1800},
    'The Singleton of Dufftown 15 YO':{qty:2,extraCl:0,price:3300}, 'Ciroc Vodka':{qty:2,extraCl:0,price:2350},
    'Smirnoff North':{qty:0,extraCl:12,price:1140}, 'Smirnoff 750':{qty:0,extraCl:0,price:1140},
    'Don Julio':{qty:1,extraCl:0,price:2570},
    // rakılar: 35cl ve 70cl şişelerin geliş fiyatı farklı olduğu için ayrı havuzlar
    // (bkz. yukarıdaki rakiPool()) — kadeh (4/6/8cl) satışları hep 70CL havuzundan düşer
    'Tekirdağ Göbek 70CL':{qty:6,extraCl:50,price:1505}, 'Tekirdağ Göbek 35CL':{qty:10,extraCl:0,price:860},
    'Beylerbeyi Göbek 70CL':{qty:0,extraCl:0,price:1745}, 'Beylerbeyi Göbek 35CL':{qty:0,extraCl:0,price:970},
    'Sarı Zeybek 3 Meşe 70CL':{qty:9,extraCl:0,price:1729}, 'Sarı Zeybek 3 Meşe 35CL':{qty:20,extraCl:0,price:1000},
    'Yeni Rakı Yeni Seri 70CL':{qty:11,extraCl:0,price:1245}, 'Yeni Rakı Yeni Seri 35CL':{qty:14,extraCl:0,price:705}
  };
  alkStock.forEach(s=>{
    const d=ALKOL_SAYIM[s.name];
    if(!d) return;
    s.qty=d.qty; s.extraCl=d.extraCl; s.price=d.price;
    if(d.bottleCl) s.bottleCl=d.bottleCl;
  });

  /* fotoğraflarda olup menüde/reçetede hiç karşılığı olmayan (dolayısıyla yukarıdaki
     otomatik türetmede hiç oluşmayan) markalar — kendi yeni stok kalemi olarak eklenir,
     hiçbir reçeteye bağlı değildir, istenirse Menü Yönetimi'nden sonradan bağlanabilir */
  const YENI_ALKOL=[
    {name:'Strongbow Bira', cat:'Biralar', bottleCl:33, qty:17, extraCl:0, price:199},
    {name:'Bitburger',      cat:'Biralar', bottleCl:33, qty:23, extraCl:0, price:80},

    {name:'Kastro Tirelli Elaia',   cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:550},
    {name:'Suvla Clairet',          cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:950},
    {name:'Paşaeli Blush',          cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:300},
    {name:'Kastro Tirelli Beyaz',   cat:'Şaraplar', bottleCl:75, qty:3,  extraCl:0, price:800},
    {name:'Barton&Guestier',        cat:'Şaraplar', bottleCl:75, qty:2,  extraCl:0, price:1200},
    {name:'Porta Caeli Pacem',      cat:'Şaraplar', bottleCl:75, qty:5,  extraCl:0, price:1431},
    {name:'Prodom Rose',            cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:388},
    {name:'Chateau Bertineau',      cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:1800},
    {name:'Porta Caeli Felici 1.5LT Rose', cat:'Şaraplar', bottleCl:150, qty:1, extraCl:0, price:1400},
    {name:'Porta Caeli Felici 75CL Rose',  cat:'Şaraplar', bottleCl:75,  qty:15,extraCl:0, price:750},
    {name:'Porta Caeli 2021',       cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:2500},
    {name:'Porta Caeli Ament Blend',cat:'Şaraplar', bottleCl:75, qty:13, extraCl:0, price:1900},
    {name:'Domaines Ott',           cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:2700},
    {name:'Prodom Tellus Merlot',   cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:850},
    {name:'Sevilen 900 Füme Blanc', cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:750},
    {name:'Sobran Nebbianca Beyaz', cat:'Şaraplar', bottleCl:75, qty:2,  extraCl:0, price:1300},
    {name:'Chateau de Seguin Merlot', cat:'Şaraplar', bottleCl:75, qty:1, extraCl:0, price:1100},
    {name:'Jolie Rose',             cat:'Şaraplar', bottleCl:75, qty:2,  extraCl:0, price:1100},
    {name:'Doluca Signium Cabernet Sauvignon', cat:'Şaraplar', bottleCl:75, qty:4, extraCl:0, price:1334},
    {name:'Arcadia Pinot Gris Rose',cat:'Şaraplar', bottleCl:75, qty:6,  extraCl:0, price:850},
    {name:'Sevilen Sıcak Şarap',    cat:'Şaraplar', bottleCl:75, qty:2,  extraCl:0, price:600},
    {name:'Domaine Chablis',        cat:'Şaraplar', bottleCl:75, qty:8,  extraCl:0, price:3000},
    {name:'Moet İce Rose',          cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:5500},
    {name:'Moet İce İmperial 75CL', cat:'Şaraplar', bottleCl:75, qty:2,  extraCl:0, price:4600},
    {name:'Luc Belaire',            cat:'Şaraplar', bottleCl:75, qty:3,  extraCl:0, price:2000},
    {name:'Moet N.I.R',             cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:4500},
    {name:'Chamlija Tharacian Beyaz', cat:'Şaraplar', bottleCl:75, qty:1, extraCl:0, price:945},
    {name:'Chamlija Felix Culpa',   cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:664.93},
    {name:'Miraval Provence 3LT',   cat:'Şaraplar', bottleCl:300,qty:1,  extraCl:0, price:9500},
    {name:'Chiarli Mio',            cat:'Şaraplar', bottleCl:75, qty:20, extraCl:0, price:450},
    {name:'Broglia La Meirana',     cat:'Şaraplar', bottleCl:75, qty:1,  extraCl:0, price:0},
    {name:'Likya Arkeo Açıkara Kırmızı 75CL', cat:'Şaraplar', bottleCl:75, qty:11, extraCl:0, price:1350},
    {name:'La Cantina 1919 Cuvee Brut', cat:'Şaraplar', bottleCl:75, qty:30, extraCl:0, price:0},

    {name:'Tia Maria',              cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:50, price:800},
    {name:'Napoleon Brandy',        cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:8,  price:520},
    {name:'Martel V.S',             cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:30, price:1310.75},
    {name:'Martel V.S.O.P',         cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:35, price:1734.81},
    {name:'Baileys',                cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:5,  price:1000},
    {name:'Safari',                 cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:12, price:960},
    {name:'Southern Comfort 100CL', cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:60, price:1200},
    {name:'Archers Schnapps 70CL',  cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:10, price:1300},
    {name:'Absolut Elyx',           cat:'Ağır Alkoller', bottleCl:70,  qty:3, extraCl:0,  price:1650},
    {name:'Malfy Limon',            cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:35, price:1260},
    {name:'Malfy Rose',             cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:12, price:1260},
    {name:'Volcan Blanco',          cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:1034.78},
    {name:'Havana 7 Anos',          cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:60, price:1150},
    {name:'Havana Selección',       cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:40, price:1465},
    {name:'Jack Apple 1LT',         cat:'Ağır Alkoller', bottleCl:100, qty:1, extraCl:0,  price:1268},
    {name:'Aberlour 12 Yıl',        cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:20, price:2400},
    {name:'Chivas 18 Yıl 70CL',     cat:'Ağır Alkoller', bottleCl:70,  qty:3, extraCl:0,  price:3000},
    {name:'Belvedere 70CL',         cat:'Ağır Alkoller', bottleCl:70,  qty:3, extraCl:0,  price:1650},
    {name:'Grey Goose',             cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:0,  price:2100},
    {name:'Belvedere Forest',       cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:1745.65},
    {name:'Olmeca 100CL',           cat:'Ağır Alkoller', bottleCl:100, qty:1, extraCl:20, price:1800},
    {name:'Beluga Gold',            cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:3350},
    {name:'Altos Tekila 70CL',      cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:1185.46},
    {name:'Ojo de Tigre Tekila 70CL', cat:'Ağır Alkoller', bottleCl:70, qty:0, extraCl:50, price:1310.75},
    {name:'Avion Silver',           cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:65, price:1600},
    {name:'Lillet Blanc',           cat:'Ağır Alkoller', bottleCl:75,  qty:1, extraCl:0,  price:493.46},
    {name:'The Glenlivet 12 Yıl',   cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:0,  price:1117.98},
    {name:'Deacon Viski 70CL',      cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:848.13},
    {name:'Ballantines 7 Yıl',      cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:878.26},
    {name:'Martini Bianco 70CL',    cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:1200},
    {name:'Ardbeg Ten',             cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:50, price:1459.66},
    {name:'Lillet Rose',            cat:'Ağır Alkoller', bottleCl:75,  qty:0, extraCl:60, price:493.46},
    {name:'Grappa',                 cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:1250},
    {name:'Malibu 100CL',           cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:95, price:985},
    {name:"The Glenlivet Founder's Reserve", cat:'Ağır Alkoller', bottleCl:70, qty:0, extraCl:60, price:2450},
    {name:'Bumbu Rumco',            cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:12, price:1028},
    {name:'Lot No:40',              cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:1580},
    {name:'Jagermeister 100CL',     cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:20, price:1600},
    {name:'Gordon 100CL',           cat:'Ağır Alkoller', bottleCl:100, qty:4, extraCl:20, price:1152},
    {name:"Hendrick's 70CL",        cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:3200},
    {name:'Chivas Extra 70CL',      cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:60, price:1491.50},
    {name:'Passao Likör',           cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:50, price:850},
    {name:'Disaronno 1LT',          cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:0,  price:0},
    {name:'Volcan X.A 70CL',        cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:9600},
    {name:"Belvedere B10.Yıl",      cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:10000},
    {name:"J&B Rare Viski 100CL",   cat:'Ağır Alkoller', bottleCl:100, qty:12,extraCl:40, price:1150},
    {name:"J&B Rare Viski 70CL",    cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:1150},
    {name:'Volare Vanilya',         cat:'Ağır Alkoller', bottleCl:70,  qty:1, extraCl:0,  price:550},
    {name:'Garrone Extra Dry 100CL',cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:95, price:960},
    {name:'Zacapa Solera Grand Reserva', cat:'Ağır Alkoller', bottleCl:70, qty:2, extraCl:0, price:2500},
    {name:'Smirnoff Red Votka 70CL',cat:'Ağır Alkoller', bottleCl:70,  qty:0, extraCl:0,  price:1140},
    {name:'Smirnoff Red 100CL',     cat:'Ağır Alkoller', bottleCl:100, qty:0, extraCl:40, price:1600},
    {name:'Don Julio 1942 70CL',    cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:0,  price:5640},
    {name:'Don Julio Anejo 70CL',   cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:0,  price:3010},
    {name:'Don Julio Reposado 70CL',cat:'Ağır Alkoller', bottleCl:70,  qty:2, extraCl:0,  price:2775},
    {name:'Yeni Rakı 70CL', cat:'Ağır Alkoller', bottleCl:70, qty:6,  extraCl:0, price:1200},
    {name:'Yeni Rakı 35CL', cat:'Ağır Alkoller', bottleCl:35, qty:10, extraCl:0, price:635}
  ].map(x=>({id:nid(), unit:'adet', low:x.bottleCl*2, crit:x.bottleCl, ...x}));
  alkStock.push(...YENI_ALKOL);

  /* ---------- alkolsüz içecekler (adet) — menüden satılan şişe/kutular kendi stoklarından,
     Tonik ise menüde tek başına satılmayıp yalnızca kokteyl/sangria içinde kullanılır.
     Cola/Fanta/Sprite fiziksel sayımda tek kalem olarak tutulduğu için (aynı kasadan
     karışık çıkıyorlar) TEK ortak stok kalemine bağlanır — bkz. RCP altı. Gerçek sayım
     ve geliş fiyatlarıyla dolduruldu; fotoğrafta karşılığı olmayanlar (Soda, Tonik) 0'da. */
  const icecekStock = [
    {id:nid(), name:'Cola,Fanta,Sprite', cat:'İçecek', qty:252, unit:'adet', low:24, crit:6, price:55},
    {id:nid(), name:'Redbull', cat:'İçecek', qty:36, unit:'adet', low:24, crit:6, price:63},
    {id:nid(), name:'S. Pelegrino 25cl', cat:'İçecek', qty:318, unit:'adet', low:24, crit:6, price:9},
    {id:nid(), name:'S. Pelegrino 70cl', cat:'İçecek', qty:22, unit:'adet', low:24, crit:6, price:135},
    {id:nid(), name:'Su 330ml', cat:'İçecek', qty:251, unit:'adet', low:24, crit:6, price:19},
    {id:nid(), name:'Su 750ml', cat:'İçecek', qty:143, unit:'adet', low:24, crit:6, price:40},
    {id:nid(), name:'Soda', cat:'İçecek', qty:0, unit:'adet', low:24, crit:6, price:0},
    {id:nid(), name:'Tonik', cat:'İçecek', qty:0, unit:'adet', low:24, crit:6, price:0},
    // fotoğrafta olup menüde tek başına satılmayan (reçeteye bağlı olmayan) kalemler
    {id:nid(), name:'Cappy Litrelik Meyvesuyu', cat:'İçecek', qty:39, unit:'adet', low:24, crit:6, price:118},
    {id:nid(), name:'Fusetea', cat:'İçecek', qty:111, unit:'adet', low:24, crit:6, price:35},
    {id:nid(), name:'Cappy Cam Meyvesuyu', cat:'İçecek', qty:53, unit:'adet', low:24, crit:6, price:42.5},
    {id:nid(), name:'Litrelik Cola,Fanta,Sprite', cat:'İçecek', qty:1, unit:'adet', low:24, crit:6, price:66},
    {id:nid(), name:'Schwepps Cam 250ml', cat:'İçecek', qty:58, unit:'adet', low:24, crit:6, price:46},
    {id:nid(), name:'Türk Kahvesi 100gr', cat:'İçecek', qty:25, unit:'adet', low:24, crit:6, price:83},
    {id:nid(), name:'Su 500ml PET', cat:'İçecek', qty:19, unit:'adet', low:24, crit:6, price:5.8},
    {id:nid(), name:'Schwepps Litrelik', cat:'İçecek', qty:10, unit:'adet', low:24, crit:6, price:55},
    {id:nid(), name:'The Whirl Çekirdek Kahve', cat:'İçecek', qty:15, unit:'adet', low:24, crit:6, price:1250},
    {id:nid(), name:'İçim Barista Sütü 1LT', cat:'İçecek', qty:59, unit:'adet', low:24, crit:6, price:55},
    {id:nid(), name:'Bardak Su', cat:'İçecek', qty:504, unit:'adet', low:24, crit:6, price:0},
    {id:nid(), name:'Su PET 1LT', cat:'İçecek', qty:0, unit:'adet', low:24, crit:6, price:15},
    {id:nid(), name:'Damacana Su 19LT', cat:'İçecek', qty:5, unit:'adet', low:24, crit:6, price:175},
    {id:nid(), name:'Şalgam', cat:'İçecek', qty:6, unit:'adet', low:24, crit:6, price:0}
  ];

  /* ---------- kokteyl/kahve malzemeleri — menüde tek başına satılmaz, yalnızca reçetelerde
     kullanılır. Önceden her tat (çilek/mango/elma püresi, karamel/vanilya şurubu vb.) ayrı
     stok kalemiydi; artık fiziksel sayımda olduğu gibi tek "Şuruplar" ve tek "Püreler" havuzu.
     İkisi de şişeli takip (bkz. ui/js/stock.js), ama şişe boyutları farklı: Püreler 1 adet
     = 100cl (1 LT), Şuruplar 1 adet = 75cl. Kokteyl reçeteleri (elmalı mojito, karamelli
     ice latte vb.) hep bu ortak havuzdan cl olarak düşer. */
  const kokteylMalzeme = [
    {id:nid(), name:'Şuruplar', cat:'Kokteyl Malzemesi', qty:56, unit:'adet', bottleCl:75, extraCl:0, price:330, low:70, crit:25},
    {id:nid(), name:'Püreler',  cat:'Kokteyl Malzemesi', qty:24, unit:'adet', bottleCl:100, extraCl:0, price:415, low:70, crit:25}
  ];

  /* ---------- temizlik malzemeleri — menüyle/reçeteyle hiç ilişkisi yok, sadece envanter takibi ---------- */
  const temizlikStock = [
    {id:nid(), name:'Selpak Sensörlü Havlu Peçete', cat:'Temizlik Malzemeleri', qty:1,   unit:'adet', low:2, crit:1,   price:1000},
    {id:nid(), name:'Selpak Garson Katlama 20 Adet', cat:'Temizlik Malzemeleri', qty:1,  unit:'adet', low:2, crit:1,   price:1500},
    {id:nid(), name:'Eldiven',                       cat:'Temizlik Malzemeleri', qty:8,  unit:'adet', low:4, crit:2,   price:340},
    {id:nid(), name:"Jumbo Çöp Poşeti 12'li",        cat:'Temizlik Malzemeleri', qty:1,  unit:'adet', low:2, crit:1,   price:1616},
    {id:nid(), name:'Temizlik Mobu',                 cat:'Temizlik Malzemeleri', qty:3,  unit:'adet', low:2, crit:1,   price:170},
    {id:nid(), name:'Diversey Typogel Çamaşır Suyu 5LT', cat:'Temizlik Malzemeleri', qty:0, unit:'adet', low:2, crit:1, price:0},
    {id:nid(), name:'Cam Temizleme Bezi',            cat:'Temizlik Malzemeleri', qty:5,  unit:'adet', low:2, crit:1,   price:70},
    {id:nid(), name:'Pipet 2.500 Adet',              cat:'Temizlik Malzemeleri', qty:0.5,unit:'adet', low:1, crit:0.5, price:2083.33},
    {id:nid(), name:'Selpak Tuvalet Kağıdı',         cat:'Temizlik Malzemeleri', qty:1,  unit:'adet', low:2, crit:1,   price:835}
  ];

  const stock=[...alkStock, ...icecekStock, ...kokteylMalzeme, ...temizlikStock];
  const sid=n=>{ const s=stock.find(x=>x.name===n); if(!s) throw new Error('alkol stoğu bulunamadı: '+n); return s.id; };


  const RCP={
    // kadeh şaraplar
    'Beyaz Şarap (Pinot Grigio)':     [[sid('Pinot Grigio'),18]],
    'Kırmızı Şarap (Pasqua Merlot)':  [[sid('Pasqua Merlot'),18]],
    'Roze Şarap (Pinot Grigio Rose)': [[sid('Pinot Grigio Rose'),18]],
    'Prosecco':                       [[sid('Prosecco'),18]],
    // imza kokteyller
    'Azumare Special':       [[sid("Gordon's Day Gin"),5],[sid('Garrone Triple Sec'),2]],
    'Azumare Passion':       [[sid('Yeni Rakı Yeni Seri 70CL'),4],[sid('Püreler'),2]],
    'Azumare Chilli Passion':[[sid('Don Julio'),5],[sid('Garrone Triple Sec'),2],[sid('Püreler'),2]],
    'Chilli Negroni':        [[sid("Gordon's Day Gin"),2],[sid('Martini Rosso'),2],[sid('Campari'),2]],
    'NO1':                   [[sid('J&B 225'),5],[sid('Amaretto'),2],[sid('Şuruplar'),2]],
    'Aperol Margarita':      [[sid('Aperol'),2],[sid('Don Julio'),4],[sid('Şuruplar'),1],[sid('Soda'),1]],
    'Azumare Refresh':       [[sid("Gordon's Day Gin"),5]],
    // classic / universal kokteyl
    'Lynchburg Lemonade':    [[sid('J&B 225'),5],[sid('Garrone Triple Sec'),2]],
    'Margarita':             [[sid('Don Julio'),5],[sid('Garrone Triple Sec'),2]],
    'Mojito':                [[sid('Captain Morgan White'),5]],
    'Caipirinha':            [[sid('Captain Morgan White'),5]],
    'Whiskey Sour':          [[sid('J&B 225'),5],[sid('Garrone Triple Sec'),2]],
    'Moscow Mule':           [[sid('Smirnoff 750'),5],[sid('Tonik'),1]],
    'Negroni':               [[sid('Campari'),2],[sid("Gordon's Day Gin"),2],[sid('Garrone Triple Sec'),2],[sid('Garrone Rosso'),2]],
    'Aperol Spritz':         [[sid('Aperol'),5],[sid('Prosecco'),8],[sid('Soda'),1]],
    'Espresso Martini':      [[sid('Smirnoff 750'),5],[sid('Kahlua'),2]],
    'Pornstar Martini':      [[sid('Smirnoff 750'),5],[sid('Prosecco'),5]],
    'Long Island Iced Tea':  [[sid('Smirnoff 750'),7.5],[sid("Gordon's Day Gin"),7.5],[sid('Captain Morgan White'),7.5],[sid('Don Julio'),7.5],[sid('Garrone Triple Sec'),7.5]],
    // alkolsüz kokteyller (Alkolsüz Mojito'nun meyve seçeneği VARIANTS'ta)
    'Azumare Sunset': [[sid('Püreler'),4]],
    // kendi şişe/kutusundan 1 adet düşen sade içecekler (Cola/Fanta/Sprite ortak havuzdan)
    'Cola':[[sid('Cola,Fanta,Sprite'),1]], 'Fanta':[[sid('Cola,Fanta,Sprite'),1]], 'Sprite':[[sid('Cola,Fanta,Sprite'),1]], 'Redbull':[[sid('Redbull'),1]],
    'S. Pelegrino 25cl':[[sid('S. Pelegrino 25cl'),1]], 'S. Pelegrino 70cl':[[sid('S. Pelegrino 70cl'),1]],
    'Su 330ml':[[sid('Su 330ml'),1]], 'Su 750ml':[[sid('Su 750ml'),1]], 'Soda':[[sid('Soda'),1]],
    // sangria (1LT, 4 lezzet de aynı reçete)
    'Ananaslı Sangria':  [[sid("Gordon's Day Gin"),10],[sid('Pinot Grigio'),18],[sid('Pinot Grigio Rose'),18],[sid('Tonik'),1]],
    'Kavunlu Sangria':   [[sid("Gordon's Day Gin"),10],[sid('Pinot Grigio'),18],[sid('Pinot Grigio Rose'),18],[sid('Tonik'),1]],
    'Çilekli Sangria':   [[sid("Gordon's Day Gin"),10],[sid('Pinot Grigio'),18],[sid('Pinot Grigio Rose'),18],[sid('Tonik'),1]],
    'Şeftalili Sangria': [[sid("Gordon's Day Gin"),10],[sid('Pinot Grigio'),18],[sid('Pinot Grigio Rose'),18],[sid('Tonik'),1]],
    // şişe kokteyl (1LT = 4 porsiyon, tek porsiyon reçetesinin 4 katı — Sunset hariç, o ayrı verildi)
    'Azumare Refresh (Şişe 1LT)':     [[sid("Gordon's Day Gin"),20]],
    'Sunset (Şişe 1LT)':              [[sid('Smirnoff 750'),12],[sid('Campari'),6],[sid('Püreler'),4]],
    'Long Island Ice Tea (Şişe 1LT)': [[sid('Smirnoff 750'),28.5],[sid("Gordon's Day Gin"),28.5],[sid('Captain Morgan White'),28.5],[sid('Don Julio'),28.5],[sid('Garrone Triple Sec'),28.5]],
    'Lyncburg Lemonade (Şişe 1LT)':   [[sid('J&B 225'),20],[sid('Garrone Triple Sec'),8]]
  };

  /* ---------- seçenekli ürünler ----------
     Garson üründe tıkladığında hangi seçenek (meyve/aroma) alındığını sorar;
     seçilen seçeneğin "extra" reçetesi, ürünün temel reçetesine EKLENEREK düşülür. */
  const VARIANTS={
    'Mojito':           [{label:'Sade', extra:[]}, {label:'Çilekli', extra:[[sid('Püreler'),2]]}, {label:'Elmalı', extra:[[sid('Püreler'),2]]}],
    'Alkolsüz Mojito':  [{label:'Sade', extra:[]}, {label:'Çilekli', extra:[[sid('Püreler'),2]]}, {label:'Elmalı', extra:[[sid('Püreler'),2]]}],
    'Ice Latte':        [{label:'Sade', extra:[]}, {label:'Karamelli', extra:[[sid('Şuruplar'),2]]}, {label:'Vanilyalı', extra:[[sid('Şuruplar'),2]]}]
  };

  const menu=MENU_ROWS.map(([name,cat,tl],i)=>{
    let recipe=RCP[name];
    if(!recipe){
      if(cat==='Rakılar'){
        const m=name.match(/^(.+) (\d+)cl$/);
        if(m) recipe=[[sid(rakiPool(m[1],+m[2])),+m[2]]];
      } else if(KADEH_SPIRIT_CATS.includes(cat)){
        recipe=[[sid(name),5]];
      } else if(BOTTLE_CATS.includes(cat)){
        recipe=[[sid(name),75]];
      } else if(cat==='Biralar'){
        recipe=[[sid(name),1]];
      }
    }
    const row={id:'m'+(i+1), name, cat, price:{TL:tl,USD:0,EUR:0}, recipe:(recipe||[]).map(([s,q])=>({s,q}))};
    if(VARIANTS[name]) row.variants=VARIANTS[name].map(v=>({label:v.label, extra:v.extra.map(([s,q])=>({s,q}))}));
    return row;
  });

  return {
    users:[
      {id:'u1',username:'bahar',   pass:'7811',name:'Bahar',          role:'admin'},
      {id:'u2',username:'mahmut',  pass:'9274',name:'Mahmut',         role:'admin'},
      {id:'u3',username:'depo',    pass:'2207',name:'Depo Sorumlusu', role:'depo'},
      {id:'u4',username:'muhasebe',pass:'4823',name:'Funda',          role:'muhasebe'},
      {id:'u5',username:'kadir',   pass:'1234',name:'Kadir',          role:'garson'},
      {id:'u6',username:'muhammed',pass:'1234',name:'Muhammed',       role:'garson'},
      {id:'u7',username:'fevzi',   pass:'1234',name:'Fevzi',          role:'garson'},
      {id:'u8',username:'ugur',    pass:'1234',name:'Uğur',           role:'garson'}
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
    expenses:[],
    day:{open:false, date:null, openingFloat:0, openedAt:null, openedBy:null, lastNextFloat:0},
    dayHistory:[],
    floatChecks:[],
    stockCats:[],
    menuCatList:[],
    nextCheckNo:1,
    settings:{stockEnabled:true, remoteOrderingEnabled:false, remoteAdminFullAccess:false, businessName:'Azumare Lounge'}
  };
}

/* Yeni bir restoran (kiracı) için tamamen boş başlangıç durumu — Azumare'ye
   özel hiçbir masa/menü/reçete/personel içermez, tek bir yönetici hesabıyla
   açılır; Masa Planı → "+ Yeni Masa" ve Menü Yönetimi → "+ Yeni Ürün" ile
   sıfırdan kurulur. Aşağıdaki bayraklar, app.js'teki Azumare'ye özel geçmiş
   tek seferlik veri göçlerinin (personel isimleri, Sangria yeniden adlandırma
   vb.) bu boş kurulumda hiç çalışmaması için baştan uygulanmış sayılır —
   göç edilecek eski veri zaten yok. Bu fonksiyon, yeni bir cihaz/tarayıcıda
   localStorage boşsa (app.js: db = loadDB() || seedDBBlank()) varsayılan
   olarak kullanılır; mevcut Azumare cihazları kendi kayıtlı verisini
   bulduğu için hiç buraya uğramaz. */
function seedDBBlank(){
  return {
    users:[{id:'u1', username:'admin', pass:'1234', name:'Yönetici', role:'admin'}],
    rates:{USD:0, EUR:0, updatedAt:null},
    stock:[],
    menu:[],
    tables:[],
    sales:[],
    cari:[],
    stockLog:[],
    expenses:[],
    day:{open:false, date:null, openingFloat:0, openedAt:null, openedBy:null, lastNextFloat:0},
    dayHistory:[],
    floatChecks:[],
    stockCats:[],
    menuCatList:[],
    nextCheckNo:1,
    settings:{stockEnabled:true, remoteOrderingEnabled:false, remoteAdminFullAccess:false, businessName:'Restoranım'},
    menuRealSeeded:true, stockAlkolSeeded:true, stockNonAlkolRemoved:true, usdFromEurApplied:true,
    tables25Seeded:true, usersRealSeeded:true, adminUsernameRenamed:true, testDataCleared:true,
    recipeFix1Applied:true, stockDrinksAdded:true, menuVariantsAdded:true, mahmutAdminAdded:true,
    alkolsuzKokteylMovedToSoft:true, sangriaNamesRenamed:true, mojitoSadeAdded:true,
    stockSettingApplied:true, stockBottleTrackApplied:true, stockIcecekKokteylMalzemeApplied:true,
    stockTemizlikAdded:true, stockSuruplarClFix:true
  };
}
