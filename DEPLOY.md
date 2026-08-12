# WALKY POS — Canlı Sunucu Kurulumu ve İşletme Rehberi

## Mimari (özet)

```
KASA CİHAZI (restoran)                SUNUCU (senin domainin)        UZAK CİHAZLAR (tam erişim)
┌────────────────────┐   otomatik   ┌─────────────────────┐  canlı  ┌────────────────────────┐
│ Uygulama + yerel   │ ◄──────────► │ Restoran başına     │ ◄─────► │ Garson telefonu 📱     │
│ veritabanı         │  push + SSE  │ veri + kimlik doğr. │ (SSE +  │ Patron / Muhasebe /    │
│ İNTERNETSİZ TAM    │  (internet   │ + çakışma kontrolü  │  CAS)   │ Depo — internet varken │
│ ÇALIŞIR            │   varsa)     │ data/ klasörü       │         │ sipariş dahil her işlem│
└────────────────────┘              └─────────────────────┘         └────────────────────────┘
```

- **Çok-yazarlı model**: internete bağlı her cihaz (garson telefonu dahil)
  sipariş girebilir, stok sayabilir, tahsilat alabilir. Değişiklikler
  sunucu üzerinden tüm cihazlara 1-2 saniye içinde yansır (SSE).
- **Çakışma kontrolü (CAS)**: iki cihaz tam aynı anda yazarsa sunucu ikinciyi
  reddeder; o cihaz güncel durumu otomatik alır ve kullanıcıya "son işleminizi
  kontrol edin" uyarısı gösterilir. Küçük restoranlarda nadirdir.
- **Kasa önceliği**: internet kesilirse SADECE kasa çalışmaya devam eder
  (uzak cihazlar bağlantı ister). Kesinti sırasında kasada yapılan işlemler,
  bağlantı gelince sunucuya yazılır ve kasa her zaman kazanır — kesinti
  anında restoranın gerçek durumu kasadadır. Rozet: 🟢 senkron · 🟡 bekliyor.
- **Uzak giriş** (`https://alanadin.com` → **Uzaktan Erişim** sekmesi):
  - Personel: restoran kodu + kasadaki kullanıcı adı/şifre (örn. `demo` + `garson`)
  - Sahip hesapları: e-posta + şifre (sunucuda tanımlanır, aşağıya bakın);
    `patron` rolü uygulamada yönetici yetkisiyle çalışır.

## Lokalde çalıştırma (test)

```
npm run dev          → http://localhost:3000
```

İlk açılışta `data/` klasörü ve **demo** kiracısı otomatik oluşur.
Kasa eşleştirme anahtarı: `data/demo-key.txt` içinde.
Uzaktan erişim: personel için restoran kodu `demo` + kasa kullanıcıları
(garson/admin/depo/muhasebe, şifre 1234); sahip hesapları için
patron@demo.com · muhasebe@demo.com · depo@demo.com (şifre 1234).

Kasayı sunucuya bağlamak: admin ile gir → **Kullanıcılar → Canlı Sunucu
Bağlantısı** → kiracı kimliği (`demo`) + API anahtarını yapıştır → Bağlan.

## Yeni restoran (müşteri) ekleme

Her müşteri = bir **kiracı**. Kod değişmez, deploy gerekmez:

```
node server.js --add-tenant "Lezzet Durağı"
  → id: lezzet-duragi  +  cihaz API anahtarı üretilir

node server.js --add-user lezzet-duragi patron@lezzet.com "Ahmet Bey" patron GucluSifre123
  → roller: patron | muhasebe | depo
```

- Restorandaki kasada kiracı kimliği + API anahtarı **bir kez** girilir.
- Veriler `data/state_<kiracı>.json` dosyalarında **tamamen ayrı** durur.
- Sunucu, hangi restorana erişileceğine her zaman doğrulanmış kimlikten
  (API anahtarı / oturum) karar verir — bir müşteri başka müşterinin
  verisine hiçbir şekilde ulaşamaz.

## Prodüksiyon kurulumu (domain + VPS)

Gerekenler: **bir alan adı** (~₺500/yıl) + **küçük bir VPS** (~₺250–300/ay).
Tüm müşteriler aynı sunucuda barınır; müşteri başına ek maliyet yoktur.

### 1. Alan adı
- `.com` ≈ 10–13 USD/yıl (Cloudflare Registrar maliyetine satar, Namecheap vb.)
- `.com.tr` ≈ ₺300–400/yıl (TRABIS üzerinden, artık belge istenmiyor)
- DNS'te bir **A kaydı** ile alan adını VPS'in IP'sine yönlendir.

### 2. VPS (örn. Hetzner CX22, €4–5/ay)
Ubuntu 24.04 üzerinde:

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs caddy

# Uygulama
sudo mkdir -p /opt/walky && sudo chown $USER /opt/walky
git clone https://github.com/walky48/walky-pos /opt/walky
```

`/etc/systemd/system/walky.service`:
```ini
[Unit]
Description=WALKY POS
After=network.target
[Service]
WorkingDirectory=/opt/walky
ExecStart=/usr/bin/node server.js
Environment=PORT=3000
Restart=always
User=www-data
[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile` (HTTPS'i otomatik alır, sertifika derdi yok):
```
alanadin.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl enable --now walky
sudo systemctl reload caddy
```

Hepsi bu — `https://alanadin.com` yayında.

### 3. Otomatik güncelleme (kod değişikliklerinin VPS'e yansıması)

**Önemli fark:** GitHub Pages'in aksine, VPS `git push` yaptığımda kendiliğinden
güncellenmez — kurulumda çektiği kodu çalıştırmaya devam eder. Bunu aşağıdaki
script ile otomatikleştiriyoruz: VPS her gece **03:00-06:00 arası** (restoran
kapalıyken) 10 dakikada bir GitHub'ı kontrol eder, yeni commit varsa çeker ve
sunucuyu yeniden başlatır (~1-2 saniye kesinti). Bu saat aralığı bilinçli
seçildi: restoranın açık olduğu saatlerde sunucu hiç yeniden başlamasın diye.

`/opt/walky/deploy/auto-update.sh`:
```bash
#!/bin/bash
cd /opt/walky
git fetch origin main -q
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  git pull origin main -q
  systemctl restart walky
  echo "$(date '+%F %T'): güncellendi $LOCAL -> $REMOTE" >> /var/log/walky-autoupdate.log
fi
```

```bash
chmod +x /opt/walky/deploy/auto-update.sh
```

Root'un crontab'ına ekle (`sudo crontab -e`):
```
# Sadece gece 03:00-06:00 arası, 10 dakikada bir kontrol et (restoran kapalıyken)
*/10 3-5 * * * /opt/walky/deploy/auto-update.sh
```

Bu pencere dışında (gündüz/akşam) kod değişikliği olursa VPS'e o gece
03:00'te yansır — restoranın açık olduğu saatlerde sunucu hiç yeniden
başlamaz. Acil bir düzeltme gündüz yayına girmesi gerekirse, script'i elle
çalıştırmak yeterli: `sudo /opt/walky/deploy/auto-update.sh`

Not: Bu sadece statik dosyalar (ui/, backend/*.js, index.html) ve `server.js`
değişikliklerini kapsar. `data/` klasörü git'in dışında olduğu için müşteri
verisi bu işlemden hiç etkilenmez.

### 4. Yedekleme (önemli!)
`data/` klasörü tüm müşteri verisidir. Günlük yedek için crontab:
```
0 4 * * * cp -r /opt/walky/data /opt/walky-backup/$(date +\%F)
```

## Güvenlik kontrol listesi
- [ ] Gerçek müşteride demo kiracısını silin veya şifrelerini değiştirin
      (`data/tenants.json` içinden demo satırı kaldırılabilir).
- [ ] Uzaktan izleme hesaplarına güçlü şifre verin (şifreler sunucuda
      scrypt ile hash'lenir, düz metin tutulmaz).
- [ ] HTTPS zorunlu (Caddy bunu kendiliğinden sağlar) — PWA kurulumu ve
      güvenli oturum için şart.
- [ ] `data/` yedeğini düzenli alın.

## Ücretsiz alternatifler ve neden önerilmediği
- **Render/Railway ücretsiz katman**: uygulama uyur (ilk açılış ~1 dk) ve
  ücretsiz katmanda disk kalıcı değildir — restoran verisi için uygun değil.
  Ücretli katmanları (~$7/ay) VPS ile benzer maliyettedir.
- **Klasik paylaşımlı hosting (cPanel)**: Node.js sunucusu ve kalıcı
  bağlantı (SSE) çalıştıramaz — bu proje için uygun değil.
