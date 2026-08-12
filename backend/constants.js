'use strict';
/* ============================================================
   WALKY POS — sabitler
   ============================================================ */
const SYM = {TL:'₺', USD:'$', EUR:'€'};
const CUR_LABEL = {TL:'TL', USD:'DOLAR', EUR:'EURO'};
const KITCHEN_CATS = ['Yiyecek','Tatlı'];
const KADEH_CL = 5; // bir kadeh / kokteyl bardağı alkol miktarı (cl)
const ROLES = {admin:'Yönetici', garson:'Garson', depo:'Depo', muhasebe:'Muhasebe'};
const DB_KEY = 'walky_pos_v1';
const PLATE = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.5" stroke="#e8ecf5" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="#e8ecf5" stroke-width="1.4"/><path d="M3 5v6M5 5v6M4 11v8" stroke="#e8ecf5" stroke-width="1.5" stroke-linecap="round"/><path d="M20.5 5c-1.4.6-2 2-2 3.5V19" stroke="#e8ecf5" stroke-width="1.5" stroke-linecap="round"/></svg>';
