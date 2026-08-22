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

/* ---------- native (Capacitor Android) USB yazıcı — WebUSB'nin engellendiği
   durumlarda (ör. Android'in yazıcıyı zaten kendi sürücüsüne bağlamış olması)
   doğrudan Android'in kendi USB iznini kullanır, aynı Simpra gibi ---------- */
function nativePrinterAvailable(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
    && window.Capacitor.Plugins && window.Capacitor.Plugins.UsbPrinter);
}
function bytesToBase64(bytes){
  let bin=''; for(let i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function printBytesNative(bytes){
  await window.Capacitor.Plugins.UsbPrinter.printBytes({data: bytesToBase64(bytes)});
}

function printerSupported(){ return nativePrinterAvailable() || !!(navigator.usb); }
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
  let device;
  try{
    device = await navigator.usb.requestDevice({filters:[]});
  }catch(e){ toast('Yazıcı seçilmedi','err'); if(typeof render==='function') render(); return; }
  try{
    await openPrinterDevice(device);
    localStorage.setItem(PRN_KEY, JSON.stringify({vendorId:device.vendorId, productId:device.productId}));
    toast('Yazıcı bağlandı: '+(device.productName||'USB Yazıcı')+' ✓','ok');
  }catch(e){
    /* işletim sistemi (ör. Android'in kendi USB yazıcı desteği) arayüzü zaten
       tutuyor olabilir — gerçek hatayı göster ki uzaktan teşhis edilebilsin */
    toast('Yazıcıya bağlanılamadı: '+(e&&e.message?e.message:e), 'err');
  }
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

/* ---------- yazıcı metin kodlayıcı (maksimum uyumluluk) ----------
   WPC1254 kod sayfası seçimi (ESC t 48) gerçek cihazda denendi ama bu
   yazıcı/klon kontrolcü o tabloyu desteklemiyor/farklı numaralandırıyor —
   bozuk karakter olarak çıkmaya devam etti. Hangi kod sayfasını
   desteklediğini bilmediğimiz için artık kod sayfasına hiç bağımlı
   değiliz: Türkçe harfleri düz ASCII karşılıklarına çeviriyoruz. Düz
   ASCII (0-127) her ESC/POS kod sayfasında birebir aynıdır, bu yüzden
   hangi yazıcı/kod sayfası olursa olsun bozulmadan çıkar. */
const TR_ASCII = {
  'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O',
  'ş':'s','Ş':'S','ü':'u','Ü':'U','₺':'TL','—':'-','–':'-','’':"'",'‘':"'",'“':'"','”':'"'
};
/* € işareti klasik kod sayfalarının hiçbirinde yok; en yaygın Batı Avrupa
   tablosu olan WPC1252/CP1252'de 0x80 konumunda tek bayt olarak duruyor.
   Yazıcı fabrika varsayılanı bu tabloysa (çoğu Avrupa piyasası klonunda
   öyledir) doğru sembol basılır; değilse farklı bir karakter çıkabilir —
   ama tek bayt olduğu için hizalama/kayma riski YOK (bkz. printLen), sadece
   görünüm riski var. Gerçek baskıda yanlış çıkarsa burada tek satır değişir. */
const EURO_BYTE = 0x80;
function encodeReceiptText(str){
  const bytes=[];
  for(const ch of String(str||'')){
    if(ch==='€'){ bytes.push(EURO_BYTE); continue; }
    if(TR_ASCII[ch]!==undefined){
      for(const c of TR_ASCII[ch]) bytes.push(c.charCodeAt(0));
      continue;
    }
    const cp = ch.codePointAt(0);
    bytes.push(cp<128 ? cp : 0x3F);
  }
  return Uint8Array.from(bytes);
}
/* bir karakter dizisinin gerçek yazıcıda kaç karakter genişliği kaplayacağı
   (₺→"TL", €→"EUR" gibi çevirilerin uzunluk değiştirdiği durumlar dahil) —
   sütun hizalaması yapan padLine() bunu kullanmazsa fiyat satırları kayar */
function printLen(str){
  let n=0;
  for(const ch of String(str||'')){
    n += (TR_ASCII[ch]!==undefined) ? TR_ASCII[ch].length : 1;
  }
  return n;
}

/* ---------- ESC/POS metin üretici ----------
   Normal satırlar bir boy büyütüldü (çift yükseklik); sütun hizalaması
   (padLine, ui/js/print.js) artık gerçek basılı genişliği (printLen)
   kullandığı için ₺/€ gibi çevrimde uzayan simgeler kaymaya yol açmıyor.

   En kısa fiş (tek ürün) bile en az ~TARGET_MM uzunlukta çıksın diye altta
   boşluk bırakılıyor — ama bu boşluk SABİT değil: içerik (ürün sayısı)
   arttıkça boşluktan düşülüyor, yani toplam uzunluk içerik TARGET_MM'i
   geçene kadar hep aynı kalır; içerik bu sınırı geçtiğinde boşluk sıfıra
   iner ve fiş doğal uzunluğunda basılır. MM_PER_LINE_* değerleri en
   yaygın ESC/POS varsayılanına göre tahmindir (fiziksel yazıcıda santim
   cetveliyle ölçülmeden kesinleşemez) — gerçek çıktı hedeften kısa/uzun
   gelirse yalnızca bu sabitleri ayarla. */
const ESC=0x1B, GS=0x1D;
const TARGET_MM = 120; // hedef minimum fiş uzunluğu (12cm)
const MM_PER_LINE_NORMAL = 3.0;  // Font A, 1x satır yüksekliği (~24 nokta @203dpi, yaygın varsayılan)
const MM_PER_LINE_DOUBLE = 6.0;  // GS!0x01 / GS!0x11 (çift yükseklik) satır — gövde metninin tamamı bu boyda
const MM_PER_LINE_SMALL  = 2.1;  // Font B (küçük — sadece WALKY altyazısı, ~17 nokta @203dpi)
function escposFromLines(lines){
  const parts = [new Uint8Array([ESC,0x40])]; // yazıcıyı sıfırla
  lines.forEach(l=>{
    const align = l.align==='c'?1 : l.align==='r'?2 : 0;
    const size = l.big ? 0x11 : (l.small ? 0x00 : 0x01); // 0x01 = normal genişlik, çift yükseklik
    parts.push(new Uint8Array([ESC,0x61,align]));
    parts.push(new Uint8Array([ESC,0x45,l.bold?1:0]));
    parts.push(new Uint8Array([ESC,0x4D,l.small?1:0]));
    parts.push(new Uint8Array([GS,0x21,size]));
    parts.push(encodeReceiptText((l.text||'')+'\n'));
  });
  const contentMM = lines.reduce((s,l)=>s+(l.small?MM_PER_LINE_SMALL:MM_PER_LINE_DOUBLE),0);
  const tailLines = Math.max(0, Math.round((TARGET_MM-contentMM)/MM_PER_LINE_DOUBLE));
  parts.push(new Uint8Array([ESC,0x61,0]));
  parts.push(new Uint8Array([ESC,0x4D,0]));
  parts.push(new Uint8Array([GS,0x21,0x01]));
  parts.push(encodeReceiptText('\n'.repeat(tailLines)));
  parts.push(new Uint8Array([GS,0x21,0x00]));
  parts.push(new Uint8Array([GS,0x56,0])); // kağıdı kes
  let total=0; parts.forEach(p=>total+=p.length);
  const out=new Uint8Array(total); let off=0;
  parts.forEach(p=>{ out.set(p,off); off+=p.length; });
  return out;
}
async function printLinesSilently(lines){
  const bytes = escposFromLines(lines);
  if(nativePrinterAvailable()){
    try{ await printBytesNative(bytes); return true; }
    catch(e){ toast('Yazıcıya gönderilemedi: '+(e&&e.message?e.message:e), 'err'); return false; }
  }
  const ok = await tryReconnectPrinter();
  if(!ok) return false;
  try{ await sendRaw(bytes); return true; }
  catch(e){ usbPrinter=null; return false; }
}
