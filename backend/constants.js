'use strict';

const SYM = {TL:'₺', USD:'$', EUR:'€'};
const CUR_LABEL = {TL:'TL', USD:'DOLAR', EUR:'EURO'};
const KITCHEN_CATS = ['Çorba','Soğuk Mezeler','Salatalar','Ara Sıcaklar','Başlangıçlar','Deniz Ürünleri','Peynir & Soğuk Tabaklar','Ana Yemekler','Tatlılar'];
/* sipariş ekranındaki kategori düğmelerini sadeleştirmek için gruplama —
   ürünlerin gerçek .cat alanı değişmez (Menü Yönetimi ve reçeteler etkilenmez),
   sadece sipariş ekranında bu alt kategoriler tek bir üst başlık altında toplanır */
const MENU_GROUPS = {
  'Yemekler': KITCHEN_CATS,
  'Alkollü İçecekler': ['Gin','Whiskey','Rom','Biralar','Vodka','İmza Kokteyller','Classic Kokteyl','Sangria','Şişe Kokteyl','Kadeh Şaraplar']
};
const KADEH_CL = 5;
const ROLES = {admin:'Yönetici', garson:'Garson', depo:'Depo', muhasebe:'Muhasebe'};
const DB_KEY = 'walky_pos_v1';
const STOCK_UNITS = ['gr','ml','cl','adet'];
/* reçete satırında hangi birimlerin birbirine dönüştürülerek girilebileceği —
   stok kaleminin kendi (temel) birimine göre gösterilecek seçenekler.
   ml/cl birbirine çevrilebilir (1 cl = 10 ml), gr ve adet'in başka karşılığı yok. */
const STOCK_UNIT_GROUPS = { gr:['gr'], ml:['ml','cl'], cl:['ml','cl'], adet:['adet'] };
function convStockUnit(q, fromUnit, toUnit){
  if(fromUnit===toUnit) return q;
  if(fromUnit==='cl' && toUnit==='ml') return q*10;
  if(fromUnit==='ml' && toUnit==='cl') return q/10;
  return q;
}
const PLATE = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.5" stroke="#e8ecf5" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="#e8ecf5" stroke-width="1.4"/><path d="M3 5v6M5 5v6M4 11v8" stroke="#e8ecf5" stroke-width="1.5" stroke-linecap="round"/><path d="M20.5 5c-1.4.6-2 2-2 3.5V19" stroke="#e8ecf5" stroke-width="1.5" stroke-linecap="round"/></svg>';
