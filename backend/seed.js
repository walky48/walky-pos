'use strict';
function seedDB(){
  return {
    users:[
      {id:'u1',username:'admin',   pass:'1234',name:'Admin Kullanıcı', role:'admin'},
      {id:'u2',username:'garson',  pass:'1234',name:'Ahmet',           role:'garson'},
      {id:'u3',username:'depo',    pass:'1234',name:'Depo Sorumlusu',  role:'depo'},
      {id:'u4',username:'muhasebe',pass:'1234',name:'Muhasebe',        role:'muhasebe'}
    ],
    rates:{USD:47.01, EUR:53.58, updatedAt:null},
    stock:[
      {id:'s1', name:'Kola (33cl)',   cat:'İçecek',       qty:48,  unit:'adet',  low:20,  crit:8},
      {id:'s2', name:'Su (50cl)',     cat:'İçecek',       qty:120, unit:'adet',  low:30,  crit:10},
      {id:'s3', name:'Ayran (200ml)', cat:'İçecek',       qty:8,   unit:'adet',  low:20,  crit:5},
      {id:'s4', name:'Şalgam',        cat:'İçecek',       qty:25,  unit:'adet',  low:10,  crit:4},
      {id:'s5', name:'Meyve Suyu',    cat:'İçecek',       qty:30,  unit:'adet',  low:10,  crit:4},
      {id:'s6', name:'Çay',           cat:'Sıcak İçecek', qty:340, unit:'bardak',low:100, crit:40},
      {id:'s7', name:'Türk Kahvesi',  cat:'Sıcak İçecek', qty:2,   unit:'kg',    low:1,   crit:0.4},
      {id:'s8', name:'Nescafe',       cat:'Sıcak İçecek', qty:1.5, unit:'kg',    low:0.8, crit:0.3},
      {id:'s9', name:'Bitki Çayı',    cat:'Sıcak İçecek', qty:60,  unit:'adet',  low:20,  crit:8},
      {id:'s10',name:'Dana Kıyma',    cat:'Et',           qty:12.5,unit:'kg',    low:5,   crit:2},
      {id:'s11',name:'Tavuk But',     cat:'Et',           qty:3.2, unit:'kg',    low:4,   crit:1.5},
      {id:'s12',name:'Ekmek',         cat:'Unlu Mamul',   qty:40,  unit:'adet',  low:15,  crit:5},
      {id:'s13',name:'Domates',       cat:'Sebze',        qty:8,   unit:'kg',    low:4,   crit:1.5},
      {id:'s14',name:'Soğan',         cat:'Sebze',        qty:15,  unit:'kg',    low:5,   crit:2},
      {id:'s15',name:'Baklava',       cat:'Tatlı',        qty:6,   unit:'kg',    low:3,   crit:1},
      {id:'s16',name:'Sütlaç',        cat:'Tatlı',        qty:24,  unit:'adet',  low:10,  crit:4},
      {id:'s17',name:'Rakı',          cat:'Alkol',        qty:700, unit:'cl',    low:200, crit:70},
      {id:'s18',name:'Votka',         cat:'Alkol',        qty:700, unit:'cl',    low:200, crit:70},
      {id:'s19',name:'Cin',           cat:'Alkol',        qty:350, unit:'cl',    low:150, crit:70},
      {id:'s20',name:'Viski',         cat:'Alkol',        qty:700, unit:'cl',    low:200, crit:70},
      {id:'s21',name:'Tonik (20cl)',  cat:'İçecek',       qty:40,  unit:'adet',  low:15,  crit:6}
    ],
    menu:[
      {id:'m1', name:'Izgara Köfte',    cat:'Yiyecek',      price:{TL:150,USD:5,  EUR:4},  recipe:[{s:'s10',q:0.15},{s:'s12',q:0.5}]},
      {id:'m2', name:'Tavuk Şiş',       cat:'Yiyecek',      price:{TL:160,USD:3.5,EUR:3},  recipe:[{s:'s11',q:0.2}]},
      {id:'m3', name:'Karışık Izgara',  cat:'Yiyecek',      price:{TL:280,USD:6,  EUR:5},  recipe:[{s:'s10',q:0.15},{s:'s11',q:0.15}]},
      {id:'m4', name:'Mercimek Çorbası',cat:'Yiyecek',      price:{TL:100,USD:1.5,EUR:1.5},recipe:[{s:'s12',q:0.25}]},
      {id:'m5', name:'Lahmacun',        cat:'Yiyecek',      price:{TL:90, USD:2,  EUR:1.5},recipe:[{s:'s10',q:0.08},{s:'s13',q:0.05},{s:'s14',q:0.05}]},
      {id:'m6', name:'Pide',            cat:'Yiyecek',      price:{TL:120,USD:2.5,EUR:2},  recipe:[{s:'s10',q:0.1}]},
      {id:'m7', name:'Kola (33cl)',     cat:'İçecek',       price:{TL:45, USD:1,  EUR:1},  recipe:[{s:'s1',q:1}]},
      {id:'m8', name:'Su (50cl)',       cat:'İçecek',       price:{TL:20, USD:0.5,EUR:0.5},recipe:[{s:'s2',q:1}]},
      {id:'m9', name:'Ayran',           cat:'İçecek',       price:{TL:35, USD:0.5,EUR:0.5},recipe:[{s:'s3',q:1}]},
      {id:'m10',name:'Şalgam',          cat:'İçecek',       price:{TL:40, USD:1,  EUR:0.5},recipe:[{s:'s4',q:1}]},
      {id:'m11',name:'Meyve Suyu',      cat:'İçecek',       price:{TL:50, USD:1,  EUR:1},  recipe:[{s:'s5',q:1}]},
      {id:'m12',name:'Çay',             cat:'Sıcak İçecek', price:{TL:25, USD:0.5,EUR:0.5},recipe:[{s:'s6',q:1}]},
      {id:'m13',name:'Türk Kahvesi',    cat:'Sıcak İçecek', price:{TL:60, USD:1.5,EUR:1},  recipe:[{s:'s7',q:0.008}]},
      {id:'m14',name:'Nescafe',         cat:'Sıcak İçecek', price:{TL:70, USD:1.5,EUR:1.5},recipe:[{s:'s8',q:0.005}]},
      {id:'m15',name:'Bitki Çayı',      cat:'Sıcak İçecek', price:{TL:55, USD:1,  EUR:1},  recipe:[{s:'s9',q:1}]},
      {id:'m16',name:'Baklava',         cat:'Tatlı',        price:{TL:120,USD:2.5,EUR:2},  recipe:[{s:'s15',q:0.15}]},
      {id:'m17',name:'Sütlaç',          cat:'Tatlı',        price:{TL:90, USD:2,  EUR:1.5},recipe:[{s:'s16',q:1}]},
      {id:'m18',name:'Kadeh Rakı',      cat:'Alkol',        price:{TL:180,USD:4,  EUR:3.5},recipe:[{s:'s17',q:KADEH_CL}]},
      {id:'m19',name:'Kadeh Votka',     cat:'Alkol',        price:{TL:200,USD:4.5,EUR:4},  recipe:[{s:'s18',q:KADEH_CL}]},
      {id:'m20',name:'Kadeh Viski',     cat:'Alkol',        price:{TL:250,USD:5.5,EUR:5},  recipe:[{s:'s20',q:KADEH_CL}]},
      {id:'m21',name:'Gin Tonic',       cat:'Alkol',        price:{TL:300,USD:6.5,EUR:6},  recipe:[{s:'s19',q:KADEH_CL},{s:'s21',q:1}]},
      {id:'m22',name:'Vodka Sunrise',   cat:'Alkol',        price:{TL:280,USD:6,  EUR:5.5},recipe:[{s:'s18',q:KADEH_CL},{s:'s5',q:1}]}
    ],
    tables: Array.from({length:16},(_,i)=>({
      id:'t'+(i+1), name:'Masa '+(i+1), customName:null, status:'empty',
      currency:null, openedAt:null, openedBy:null, items:[], discount:null, service:null
    })),
    sales:[],
    cari:[],
    stockLog:[],
    day:{open:false, date:null, openingFloat:0, openedAt:null, openedBy:null, lastNextFloat:0},
    dayHistory:[],
    floatChecks:[]
  };
}
