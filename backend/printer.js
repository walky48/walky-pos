'use strict';
/* ============================================================
   WALKY POS — USB termal yazıcı (ESC/POS), pencere açmadan sessiz yazdırma
   Yazıcı bir kere WebUSB ile eşleştirilir (navigator.usb.requestDevice),
   sonraki her yazdırma isteğinde tarayıcı hiç dialog açmadan doğrudan
   o cihaza ham ESC/POS komutları gönderir. Desteklenmiyorsa veya
   bağlantı kurulamazsa mevcut window.print() akışına otomatik döner.
   ============================================================ */
const PRN_KEY = 'walky_printer_v1';
let usbPrinter = null; // {device, epOut}

function printerSupported(){ return !!(navigator.usb); }
function printerSavedInfo(){
  try{ const r = localStorage.getItem(PRN_KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; }
}
function printerConnected(){ return !!(usbPrinter && usbPrinter.device && usbPrinter.device.opened); }

async function openPrinterDevice(device){
  await device.open();
  if(device.configuration == null) await device.selectConfiguration(1);
  let iface=null, ep=null;
  const cfgs = device.configurations && device.configurations.length ? device.configurations : [device.configuration];
  for(const cfg of cfgs){
    for(const itf of cfg.interfaces){
      const alt = itf.alternates[0];
      const out = alt.endpoints.find(e=>e.direction==='out');
      if(out){ iface=itf.interfaceNumber; ep=out.endpointNumber; break; }
    }
    if(iface!==null) break;
  }
  if(iface===null) throw new Error('Yazıcı arayüzü bulunamadı');
  try{ await device.claimInterface(iface); }
  catch(e){ /* başka bir sürücü tutuyor olabilir — yine de deneriz */ }
  usbPrinter = {device, epOut:ep};
}

async function pairPrinter(){
  if(!printerSupported()){ toast('Bu tarayıcı/cihaz USB yazıcı bağlantısını desteklemiyor','err'); return; }
  try{
    const device = await navigator.usb.requestDevice({filters:[]});
    await openPrinterDevice(device);
    localStorage.setItem(PRN_KEY, JSON.stringify({vendorId:device.vendorId, productId:device.productId}));
    toast('Yazıcı bağlandı: '+(device.productName||'USB Yazıcı')+' ✓','ok');
  }catch(e){ toast('Yazıcı seçilmedi veya bağlanamadı','err'); }
  if(typeof render==='function') render();
}
async function tryReconnectPrinter(){
  if(printerConnected()) return true;
  if(!printerSupported()) return false;
  const saved = printerSavedInfo();
  if(!saved) return false;
  try{
    const devices = await navigator.usb.getDevices();
    const device = devices.find(d=>d.vendorId===saved.vendorId && d.productId===saved.productId);
    if(!device) return false;
    await openPrinterDevice(device);
    return true;
  }catch(e){ return false; }
}
async function sendRaw(bytes){
  if(!printerConnected()) throw new Error('yazıcı bağlı değil');
  await usbPrinter.device.transferOut(usbPrinter.epOut, bytes);
}

/* ---------- ESC/POS metin üretici ---------- */
const ESC=0x1B, GS=0x1D;
function escposFromLines(lines){
  const enc = new TextEncoder();
  const parts = [new Uint8Array([ESC,0x40])]; // yazıcıyı sıfırla
  lines.forEach(l=>{
    const align = l.align==='c'?1 : l.align==='r'?2 : 0;
    parts.push(new Uint8Array([ESC,0x61,align]));
    parts.push(new Uint8Array([ESC,0x45,l.bold?1:0]));
    parts.push(new Uint8Array([GS,0x21,l.big?0x11:0x00]));
    parts.push(enc.encode((l.text||'')+'\n'));
  });
  parts.push(new Uint8Array([ESC,0x61,0]));
  parts.push(enc.encode('\n\n\n'));
  parts.push(new Uint8Array([GS,0x56,0])); // kağıdı kes
  let total=0; parts.forEach(p=>total+=p.length);
  const out=new Uint8Array(total); let off=0;
  parts.forEach(p=>{ out.set(p,off); off+=p.length; });
  return out;
}
async function printLinesSilently(lines){
  const ok = await tryReconnectPrinter();
  if(!ok) return false;
  try{ await sendRaw(escposFromLines(lines)); return true; }
  catch(e){ usbPrinter=null; return false; }
}
