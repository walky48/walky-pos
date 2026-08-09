# WALKY POS — Canlı Sunucu Kurulumu ve İşletme Rehberi

## Mimari (özet)

```
KASA CİHAZI (restoran)                SUNUCU (senin domainin)        UZAKTAN İZLEYENLER
┌────────────────────┐   otomatik   ┌─────────────────────┐  canlı  ┌──────────────────┐
│ Uygulama + yerel   │ ───────────► │ Restoran başına     │ ──────► │ Patron (telefon) │
│ veritabanı         │    push      │ veri + kimlik doğr. │  (SSE)  │ Muhasebe / Depo  │
│ İNTERNETSİZ TAM    │  (internet   │ data/ klasörü       │         │ SALT-OKUNUR      │
│ ÇALIŞIR            │   varsa)     └─────────────────────┘         └──────────────────┘
└────────────────────┘
```

- Kasa internetsiz kalırsa hiçbir şey durmaz; sağ üstteki rozet 🟡 olur,
  bağlantı gelince son durum otomatik gönderilir ve rozet 🟢 olur.
- Uzaktan izleyenler `https://alanadin.com` adresine girip **Uzaktan İzleme**
  sekmesinden e-posta/şifreyle bağlanır; ekranları anlık güncellenir.

## Lokalde çalıştırma (test)

```
npm run dev          → http://localhost:3000
```

İlk açılışta `data/` klasörü ve **demo** kiracısı otomatik oluşur.
Kasa eşleştirme anahtarı: `data/demo-key.txt` içinde.
Uzaktan izleme demo hesapları (şifre 1234): patron@demo.com · muhasebe@demo.com · depo@demo.com

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

### 3. Yedekleme (önemli!)
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
