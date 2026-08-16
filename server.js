'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');

/* ---------- veri katmanı (JSON dosyaları, atomik yazım) ---------- */
function ensureData(){ if(!fs.existsSync(DATA)) fs.mkdirSync(DATA); }
function readJSON(file, fallback){
  try{ return JSON.parse(fs.readFileSync(path.join(DATA,file),'utf8')); }catch(e){ return fallback; }
}
function writeJSON(file, obj){
  ensureData();
  const p = path.join(DATA,file), tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, p);
}

/* ---------- kripto yardımcıları ---------- */
function newKey(bytes){ return crypto.randomBytes(bytes||24).toString('hex'); }
function hashPass(pass, salt){ return crypto.scryptSync(String(pass), salt, 64).toString('hex'); }
function safeEqual(a, b){
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function getSecret(){
  let s = readJSON('secret.json', null);
  if(!s){ s = {key:newKey(32)}; writeJSON('secret.json', s); }
  return s.key;
}
function b64u(s){ return Buffer.from(s).toString('base64url'); }
function unb64u(s){ return Buffer.from(s,'base64url').toString('utf8'); }
function signToken(payload){
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + sig;
}
function verifyToken(token){
  if(!token || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  const good = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if(!safeEqual(sig, good)) return null;
  try{
    const p = JSON.parse(unb64u(body));
    if(!p.exp || p.exp < Date.now()) return null;
    return p;
  }catch(e){ return null; }
}

/* ---------- kiracılar ---------- */
function loadTenants(){ return readJSON('tenants.json', []); }
function saveTenants(t){ writeJSON('tenants.json', t); }
function findTenant(id){ return loadTenants().find(t=>t.id===id); }
function makeTenant(name, id){
  const tenants = loadTenants();
  const tid = id || name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30) || 'restoran';
  if(tenants.some(t=>t.id===tid)) throw new Error('Bu kiracı kimliği zaten var: '+tid);
  const t = {id:tid, name, apiKey:newKey(24), users:[], createdAt:Date.now()};
  tenants.push(t); saveTenants(tenants);
  return t;
}
function addUser(tenantId, email, name, role, pass){
  const tenants = loadTenants();
  const t = tenants.find(x=>x.id===tenantId);
  if(!t) throw new Error('Kiracı bulunamadı: '+tenantId);
  email = String(email).trim().toLowerCase();
  if(tenants.some(x=>x.users.some(u=>u.email===email))) throw new Error('Bu e-posta zaten kayıtlı: '+email);
  if(['patron','muhasebe','depo'].indexOf(role) < 0) throw new Error('Rol patron|muhasebe|depo olmalı');
  const salt = newKey(16);
  t.users.push({email, name, role, salt, hash:hashPass(pass, salt), createdAt:Date.now()});
  saveTenants(tenants);
}
function stateFile(tid){ return 'state_' + tid.replace(/[^a-z0-9-]/g,'') + '.json'; }
function loadState(tid){ return readJSON(stateFile(tid), {rev:0, updatedAt:null, state:null}); }
function saveState(tid, obj){ writeJSON(stateFile(tid), obj); }

/* ---------- ilk kurulum: demo kiracı ---------- */
function bootstrap(){
  ensureData();
  if(!loadTenants().length){
    const t = makeTenant('WALKY Demo Restoran', 'demo');
    addUser('demo','patron@demo.com','Patron','patron','1234');
    addUser('demo','muhasebe@demo.com','Muhasebe','muhasebe','1234');
    addUser('demo','depo@demo.com','Depo','depo','1234');
    fs.writeFileSync(path.join(DATA,'demo-key.txt'),
      'Demo kiracı kimliği : demo\nDemo cihaz API anahtarı: '+t.apiKey+
      '\n\nUzaktan izleme hesapları (şifre: 1234):\n  patron@demo.com · muhasebe@demo.com · depo@demo.com\n');
    console.log('Demo kiracı oluşturuldu. Cihaz anahtarı: data/demo-key.txt');
  }
}

/* ---------- CLI ---------- */
const argv = process.argv.slice(2);
if(argv[0] === '--add-tenant'){
  bootstrap();
  const t = makeTenant(argv[1] || 'Restoran');
  console.log('Kiracı oluşturuldu:\n  id     : '+t.id+'\n  ad     : '+t.name+'\n  anahtar: '+t.apiKey);
  console.log('Kasa cihazında Kullanıcılar → Canlı Sunucu Bağlantısı bölümüne bu kimlik + anahtar girilir.');
  process.exit(0);
}
if(argv[0] === '--add-user'){
  bootstrap();
  try{ addUser(argv[1], argv[2], argv[3], argv[4], argv[5]); console.log('Kullanıcı eklendi: '+argv[2]+' ('+argv[4]+') → '+argv[1]); }
  catch(e){ console.error('Hata: '+e.message); process.exit(1); }
  process.exit(0);
}
if(argv[0] === '--list-tenants'){
  bootstrap();
  loadTenants().forEach(t=>{
    console.log(t.id+' — '+t.name+' — kullanıcılar: '+(t.users.map(u=>u.email+'('+u.role+')').join(', ')||'yok'));
  });
  process.exit(0);
}

/* ---------- SSE canlı yayın ---------- */
const sseClients = new Map(); // tenantId → Set<res>
function sseSend(res, event, data){
  res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');
}
function broadcast(tid, payload){
  const set = sseClients.get(tid);
  if(!set) return;
  set.forEach(res=>{ try{ sseSend(res,'state',payload); }catch(e){} });
}

/* ---------- HTTP yardımcıları ---------- */
const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Tenant-Id, X-Api-Key'
};
function sendJSON(res, code, obj){
  res.writeHead(code, Object.assign({'Content-Type':'application/json; charset=utf-8'}, CORS));
  res.end(JSON.stringify(obj));
}
function readBody(req, limit){
  return new Promise((resolve, reject)=>{
    let size = 0; const chunks = [];
    req.on('data', c=>{ size += c.length; if(size > (limit||10*1024*1024)){ reject(new Error('too-big')); req.destroy(); } else chunks.push(c); });
    req.on('end', ()=>resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function bearerToken(req, q){
  const h = req.headers['authorization'] || '';
  if(h.startsWith('Bearer ')) return h.slice(7);
  return q.get('token') || '';
}

/* ---------- API ---------- */
async function handleAPI(req, res, pathname, q){
  if(req.method === 'OPTIONS'){ res.writeHead(204, CORS); res.end(); return; }

  if(pathname === '/api/health'){ sendJSON(res, 200, {ok:true, name:'walky-pos', time:Date.now()}); return; }

  /* kasa cihazı push'u — kasa her zaman kazanır (offline dönüşünde
     restoran içindeki gerçek durum kasadadır) */
  if(pathname === '/api/sync' && req.method === 'POST'){
    const tid = String(req.headers['x-tenant-id']||''), key = String(req.headers['x-api-key']||'');
    const t = findTenant(tid);
    if(!t || !safeEqual(key, t.apiKey)){ sendJSON(res, 401, {ok:false, error:'Kimlik doğrulanamadı'}); return; }
    let body;
    try{ body = JSON.parse(await readBody(req)); }catch(e){ sendJSON(res, 400, {ok:false, error:'Geçersiz istek'}); return; }
    if(!body || !body.state){ sendJSON(res, 400, {ok:false, error:'state zorunlu'}); return; }
    const cur = loadState(tid);
    const obj = {rev:cur.rev + 1, updatedAt:Date.now(), state:body.state};
    saveState(tid, obj);
    broadcast(tid, obj);
    sendJSON(res, 200, {ok:true, rev:obj.rev});
    return;
  }

  /* uzaktan giriş — iki yol:
     1) e-posta: sunucuda tanımlı sahip hesapları (patron/muhasebe/depo)
     2) kullanıcı adı + restoran kodu: kasadaki personel hesapları (state.users) */
  if(pathname === '/api/login' && req.method === 'POST'){
    let body;
    try{ body = JSON.parse(await readBody(req, 64*1024)); }catch(e){ sendJSON(res, 400, {ok:false, error:'Geçersiz istek'}); return; }
    const login = String(body.email||body.username||'').trim(), pass = String(body.password||'');
    const tenantCode = String(body.tenant||'').trim().toLowerCase();

    if(login.includes('@')){
      const email = login.toLowerCase();
      let found = null, tenant = null;
      loadTenants().forEach(t=>t.users.forEach(u=>{ if(u.email===email){ found=u; tenant=t; } }));
      if(!found || !safeEqual(hashPass(pass, found.salt), found.hash)){
        sendJSON(res, 401, {ok:false, error:'E-posta veya şifre hatalı'}); return;
      }
      const token = signToken({t:tenant.id, u:found.email, n:found.name, r:found.role, exp:Date.now()+12*3600*1000});
      sendJSON(res, 200, {ok:true, token, tenantName:tenant.name, user:{name:found.name, role:found.role, email:found.email}});
      return;
    }

    /* personel girişi: restoran kodu zorunlu (kullanıcı adları restoranlar arası benzersiz değildir) */
    if(!tenantCode){ sendJSON(res, 400, {ok:false, error:'Personel girişi için restoran kodu gerekli'}); return; }
    const t = findTenant(tenantCode);
    const st = t ? loadState(t.id) : null;
    const su = st && st.state && Array.isArray(st.state.users)
      ? st.state.users.find(u=>u.username===login) : null;
    if(!t || !su || !safeEqual(String(su.pass||''), pass)){
      sendJSON(res, 401, {ok:false, error:'Restoran kodu, kullanıcı adı veya şifre hatalı'}); return;
    }
    const token = signToken({t:t.id, u:su.username, n:su.name, r:su.role, exp:Date.now()+12*3600*1000});
    sendJSON(res, 200, {ok:true, token, tenantName:t.name, user:{name:su.name, role:su.role, email:null}});
    return;
  }

  /* buradan sonrası kimlik ister: oturum token'ı VEYA kasa cihaz anahtarı */
  let p = verifyToken(bearerToken(req, q));
  if(!p && q.get('tenant') && q.get('key')){
    const t = findTenant(String(q.get('tenant')));
    if(t && safeEqual(String(q.get('key')), t.apiKey)) p = {t:t.id, u:'kasa', r:'device'};
  }
  if(!p){ sendJSON(res, 401, {ok:false, error:'Oturum geçersiz veya süresi dolmuş'}); return; }

  if(pathname === '/api/state'){
    const st = loadState(p.t);
    sendJSON(res, 200, {ok:true, tenant:p.t, rev:st.rev, updatedAt:st.updatedAt, state:st.state});
    return;
  }

  /* uzak istemci yazması — çakışma koruması (CAS): istemci hangi revizyonu
     temel aldıysa onu bildirir; sunucudaki güncel rev farklıysa 409 döner ve
     istemci önce güncel durumu alıp işlemi tekrarlar */
  if(pathname === '/api/push' && req.method === 'POST'){
    if(p.r === 'device'){ sendJSON(res, 400, {ok:false, error:'Kasa /api/sync kullanır'}); return; }
    let body;
    try{ body = JSON.parse(await readBody(req)); }catch(e){ sendJSON(res, 400, {ok:false, error:'Geçersiz istek'}); return; }
    if(!body || typeof body.baseRev !== 'number' || !body.state){ sendJSON(res, 400, {ok:false, error:'baseRev ve state zorunlu'}); return; }
    const cur = loadState(p.t);
    if(body.baseRev !== cur.rev){
      sendJSON(res, 409, {ok:false, error:'conflict', rev:cur.rev});
      return;
    }
    const obj = {rev:cur.rev + 1, updatedAt:Date.now(), state:body.state};
    saveState(p.t, obj);
    broadcast(p.t, obj);
    sendJSON(res, 200, {ok:true, rev:obj.rev});
    return;
  }

  if(pathname === '/api/events'){
    res.writeHead(200, Object.assign({
      'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive'
    }, CORS));
    res.write(': bağlandı\n\n');
    const st = loadState(p.t);
    sseSend(res, 'state', st);
    if(!sseClients.has(p.t)) sseClients.set(p.t, new Set());
    sseClients.get(p.t).add(res);
    const hb = setInterval(()=>{ try{ res.write(': ping\n\n'); }catch(e){} }, 25000);
    req.on('close', ()=>{ clearInterval(hb); const s=sseClients.get(p.t); if(s) s.delete(res); });
    return;
  }

  sendJSON(res, 404, {ok:false, error:'Bilinmeyen uç nokta'});
}

/* ---------- statik dosyalar ---------- */
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8'
};
const DENY = [path.sep+'data', path.sep+'.git', path.sep+'node_modules'];

function serveStatic(req, res, pathname){
  if(pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(ROOT, pathname));
  if(!filePath.startsWith(ROOT) || DENY.some(d=>filePath.startsWith(ROOT + d))){
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data)=>{
    if(err){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('404 Not Found: '+pathname); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream'});
    res.end(data);
  });
}

/* ---------- sunucu ---------- */
bootstrap();
const server = http.createServer((req, res)=>{
  const u = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(u.pathname);
  if(pathname.startsWith('/api/')){
    handleAPI(req, res, pathname, u.searchParams).catch(e=>{
      try{ sendJSON(res, 500, {ok:false, error:'Sunucu hatası'}); }catch(_){}
    });
    return;
  }
  serveStatic(req, res, pathname);
});
server.listen(PORT, ()=>{
  console.log('WALKY POS sunucusu: http://localhost:'+PORT);
});
