'use strict';

const $ = s => document.querySelector(s);

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function num(v){const n=parseFloat(String(v??'').trim().replace(',','.'));return isNaN(n)?0:n}
function fmt(n,cur){cur=cur||'TL';return SYM[cur]+Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtQ(n){return Number(n||0).toLocaleString('tr-TR',{maximumFractionDigits:2})}
function rateOf(c){return c==='TL'?1:(db.rates[c]||1)}
function uid(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function iso(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function trDate(s){if(!s)return '-';const p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0]}
function trTime(ts){return ts?new Date(ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'-'}
function trDT(ts){return ts?new Date(ts).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'-'}
function elapsedMin(ts){return Math.max(0,Math.floor((Date.now()-ts)/60000))}
function weekStartISO(){const d=new Date();const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return iso(d)}
function monthStartISO(){const d=new Date();d.setDate(1);return iso(d)}
