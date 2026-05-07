# Broşür Servisi (Brosur Servisi)

Restoranlar için otomatik tanıtım broşürü oluşturan mikroservis.
Yeni bir restoran kayıt olduğunda, restoranın logosu, görselleri ve QR kodunu
içeren PDF + PNG broşürü otomatik olarak üretir.

## 🎯 Özellikler

- **Şablon tabanlı** — Sabit tasarım, dinamik içerik (logo, görseller, QR)
- **Çoklu format** — Aynı broşür için PDF ve PNG çıktısı
- **Genişletilebilir** — Yeni broşür temaları kolayca eklenebilir
- **Bağımsız servis** — Ana backend'den ayrı çalışır, çökme/güncelleme bağımsız
- **QR kod entegre** — Her restoran için özel QR otomatik üretilir
- **A4 baskı uyumlu** — Yüksek çözünürlüklü (Retina/HiDPI) çıktı

## 🏗️ Mimari

```
┌────────────────────┐         HTTP POST         ┌──────────────────────┐
│   Ana Backend      │ ────────────────────────▶ │   Broşür Servisi     │
│   (port 5000)      │   /api/brochure/generate  │   (port 5001)        │
│                    │                            │                      │
│ Yeni restoran      │ ◀──────────────────────── │ 1. Template oku      │
│ kayıt edildi       │   { pdfUrl, pngUrl }       │ 2. QR kod üret       │
│                    │                            │ 3. HTML doldur       │
└────────────────────┘                            │ 4. PDF/PNG render    │
                                                  │ 5. Diske kaydet      │
                                                  └──────────────────────┘
                                                            │
                                                            ▼
                                                  storage/brochures/
                                                  ├── restaurant_1.pdf
                                                  ├── restaurant_1.png
                                                  ├── restaurant_2.pdf
                                                  └── restaurant_2.png
```

## 📦 Kullanılan Teknolojiler

| Paket | Görevi |
|---|---|
| **express** | HTTP sunucusu |
| **puppeteer** | HTML → PDF/PNG dönüştürücü (headless Chrome) |
| **handlebars** | HTML şablon motoru (`{{değişken}}` doldurma) |
| **qrcode** | QR kod üretici |
| **cors** | Cross-origin izinleri |
| **dotenv** | Ortam değişkenleri |
| **nodemon** | Geliştirme için otomatik yeniden başlatma |

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. .env dosyasını oluştur
cp .env.example .env  # ya da manuel olarak oluştur

# 3. Geliştirme modunda başlat
npm run dev

# Ya da normal modda
npm start
```

### .env yapısı

```
PORT=5001
NODE_ENV=development
```

Sunucu `http://localhost:5001` adresinde ayağa kalkar.

## 📡 API Endpoint'leri

Tüm endpoint'lerin önekı: `/api/brochure`

### 1. Yeni broşür üret

```http
POST /api/brochure/generate
Content-Type: application/json
```

**Request body:**

```json
{
  "id": 1,
  "restaurantName": "Pideci Kemal Usta",
  "tagline": "Yöresel Tatlar",
  "logo": "https://example.com/logo.png",
  "mainImage": "https://example.com/main.jpg",
  "secondaryImage": "https://example.com/secondary.jpg",
  "qrUrl": "https://kutyemek.com/r/1",
  "templateId": "classic-yellow"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `id` | number | ✅ | Restoran kimliği (dosya adı için) |
| `restaurantName` | string | ✅ | Restoran adı |
| `tagline` | string | ✅ | Alt slogan (örn: "Yöresel Tatlar") |
| `logo` | string (URL) | ✅ | Restoran logosu |
| `mainImage` | string (URL) | ✅ | Büyük yemek görseli |
| `secondaryImage` | string (URL) | ✅ | İkincil yemek görseli |
| `qrUrl` | string | ✅ | QR koda gömülecek link |
| `templateId` | string | ❌ | Kullanılacak şablon (varsayılan: `classic-yellow`) |

**Başarılı cevap (201):**

```json
{
  "success": true,
  "message": "Broşür başarıyla oluşturuldu",
  "data": {
    "restaurantId": 1,
    "pdfUrl": "/brochures/restaurant_1.pdf",
    "pngUrl": "/brochures/restaurant_1.png",
    "templateUsed": "classic-yellow",
    "generatedAt": "2026-05-06T16:11:23.560Z"
  }
}
```

### 2. Restoran broşür bilgisini getir

```http
GET /api/brochure/:restaurantId
```

**Örnek:** `GET /api/brochure/1`

**Cevap:**

```json
{
  "success": true,
  "data": {
    "restaurantId": "1",
    "pdfUrl": "/brochures/restaurant_1.pdf",
    "pngUrl": "/brochures/restaurant_1.png",
    "pdfSize": 245678,
    "pngSize": 1234567,
    "lastGenerated": "2026-05-06T16:11:23.560Z"
  }
}
```

### 3. Broşürü yenile (mevcut broşürü güncelle)

```http
POST /api/brochure/regenerate
```

`generate` ile aynı body'yi alır, mevcut broşürün üzerine yazar.
"Yenile" butonu için kullanılır (restoran logo/görsel değiştirdiğinde).

### 4. Mevcut şablonları listele

```http
GET /api/brochure/templates
```

**Cevap:**

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "classic-yellow",
      "name": "Klasik Sarı",
      "description": "Sarı-kırmızı tonlarında geleneksel restoran broşürü",
      "version": "1.0.0",
      "size": "A4",
      "orientation": "portrait",
      "requiredFields": [...]
    }
  ]
}
```

### 5. Üretilen broşürlere erişim

Üretilen broşürler statik olarak servis edilir:

- PDF: `http://localhost:5001/brochures/restaurant_1.pdf`
- PNG: `http://localhost:5001/brochures/restaurant_1.png`

## 📁 Klasör Yapısı

```
brosur-servisi/
├── server.js                       # Ana giriş dosyası (Express setup)
├── package.json
├── .env                            # Ortam değişkenleri
├── .gitignore
│
├── routes/
│   └── brochureRoutes.js           # URL yönlendirmeleri
│
├── controllers/
│   └── brochureController.js      # API iş mantığı
│
├── services/                       # Çekirdek servisler
│   ├── brochureGenerator.js       # Orkestra şefi (tüm parçaları birleştirir)
│   ├── templateLoader.js          # Şablon yükleyici
│   ├── qrService.js               # QR kod üretici
│   └── pdfRenderer.js             # Puppeteer ile HTML→PDF/PNG
│
├── templates/                      # Broşür şablonları
│   └── classic-yellow/             # İlk şablon (sarı-kırmızı)
│       ├── template.hbs            # Handlebars HTML
│       ├── styles.css              # Stil dosyası
│       ├── config.json             # Şablon meta bilgisi
│       └── assets/                 # (varsa) sabit görseller
│
└── storage/
    └── brochures/                  # Üretilen PDF/PNG'ler
        ├── restaurant_1.pdf
        ├── restaurant_1.png
        └── ...
```

## ➕ Yeni Şablon Ekleme

Servisin en güçlü yanlarından biri: **kod yazmadan yeni şablon eklenebilir.**

### Adımlar

**1.** `templates/` altında yeni klasör oluştur:

```bash
mkdir -p templates/modern-dark/assets
```

**2.** İçine 3 dosya koy:

`templates/modern-dark/template.hbs`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{restaurantName}}</title>
</head>
<body>
  <!-- Yeni tasarımın -->
  <h1>{{restaurantName}}</h1>
  <img src="{{logo}}">
  <img src="{{qrCode}}">
</body>
</html>
```

`templates/modern-dark/styles.css`
```css
body { background: #1a1a1a; color: white; }
/* ... */
```

`templates/modern-dark/config.json`
```json
{
  "id": "modern-dark",
  "name": "Modern Karanlık",
  "description": "Siyah arka planlı, modern restoran broşürü",
  "version": "1.0.0",
  "size": "A4",
  "orientation": "portrait",
  "requiredFields": [
    "restaurantName",
    "logo",
    "qrCode"
  ]
}
```

**3.** Servisi yeniden başlat — yeni şablon otomatik tanınır.

**4.** Kullanmak için:

```json
POST /api/brochure/generate
{
  "id": 1,
  "templateId": "modern-dark",
  ...
}
```

### Şablonda Kullanılabilir Değişkenler

Handlebars sözdizimi: `{{degisken}}`

| Değişken | Açıklama |
|---|---|
| `{{restaurantName}}` | Restoran adı |
| `{{tagline}}` | Alt slogan |
| `{{logo}}` | Logo URL'i |
| `{{mainImage}}` | Ana görsel URL'i |
| `{{secondaryImage}}` | İkincil görsel URL'i |
| `{{qrCode}}` | QR kod (base64 data URL — otomatik üretilir) |

## 🔌 Ana Backend Entegrasyonu

Ana backend'inizdeki `restaurantController.js` (veya yeni restoran kayıt eden endpoint), kayıt başarılı olduktan sonra broşür servisine HTTP isteği atmalı.

### Örnek (Node.js / axios)

```javascript
const axios = require('axios');

async function createRestaurant(req, res) {
  // ... mevcut kayıt kodun ...

  const newRestaurant = await Restaurant.create({...});

  // Broşür servisine istek at
  try {
    const brochureResponse = await axios.post(
      'http://localhost:5001/api/brochure/generate',
      {
        id: newRestaurant.id,
        restaurantName: newRestaurant.name,
        tagline: newRestaurant.slogan || 'Lezzetli Yemekler',
        logo: newRestaurant.logoUrl,
        mainImage: newRestaurant.mainImageUrl,
        secondaryImage: newRestaurant.secondaryImageUrl,
        qrUrl: `https://kutyemek.com/r/${newRestaurant.id}`
      }
    );

    // URL'leri DB'ye kaydet
    await newRestaurant.update({
      brochurePdfUrl: brochureResponse.data.data.pdfUrl,
      brochurePngUrl: brochureResponse.data.data.pngUrl
    });
  } catch (err) {
    // Broşür üretimi fail olursa restoran kaydını iptal etme,
    // sadece logla — broşür sonradan "yenile" butonuyla üretilebilir
    console.error('Broşür üretilemedi:', err.message);
  }

  return res.status(201).json({ success: true, restaurant: newRestaurant });
}
```

### .env'de broşür servisi URL'i tut

Ana backend'in `.env` dosyasına şunu ekle:

```
BROCHURE_SERVICE_URL=http://localhost:5001
```

Production'da:

```
BROCHURE_SERVICE_URL=http://brosur-servisi.kutyemek.com
```

## 🛠️ Geliştirme Notları

### Performans

- Her PDF/PNG üretimi **5-10 saniye** sürebilir (Puppeteer Chrome açıyor)
- PDF ve PNG **paralel** üretilir (`Promise.all`)
- Dış kaynaklı görseller varsa süre artabilir
- İleride: tek bir Chrome instance'ı paylaşarak süre düşürülebilir

### Güvenlik

- `templateId` parametresi **path traversal**'a karşı korumalı
- CORS şu anda tüm origin'lere açık — production'da kısıtlanmalı
- Üretilen broşürler `storage/brochures/` altında — sınırsız büyüyebilir, periyodik temizlik düşünülmeli

### İleride Yapılabilecekler

- [ ] Browser instance pooling (performans)
- [ ] Redis cache (aynı veriyle 2. üretimde tekrar render etmeden cache'ten dön)
- [ ] S3 / cloud storage entegrasyonu
- [ ] Rate limiting
- [ ] Authentication (API key)
- [ ] Webhook notification (üretim bitince ana backend'e bildirim)
- [ ] Çoklu dil desteği şablonlar için
- [ ] Yönetim panelinde "broşür önizleme" endpoint'i

## 📞 Test Komutları

### Curl ile broşür üretimi

```bash
curl -X POST http://localhost:5001/api/brochure/generate \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "restaurantName": "Test Restoran",
    "tagline": "Test Slogan",
    "logo": "https://picsum.photos/seed/logo/220/140",
    "mainImage": "https://picsum.photos/seed/main/900/500",
    "secondaryImage": "https://picsum.photos/seed/sec/400/400",
    "qrUrl": "https://kutyemek.com/r/1"
  }'
```

### Şablonları listele

```bash
curl http://localhost:5001/api/brochure/templates
```

### Broşür bilgisini getir

```bash
curl http://localhost:5001/api/brochure/1
```

## 📜 Versiyon

**v1.0.0** — İlk yayın
- `classic-yellow` şablonu
- PDF + PNG üretimi
- 4 endpoint (generate, get, regenerate, list templates)

---

**Geliştirici:** Tunç Kurtoğlu
**Proje:** Kut Yemek — Restoran Yönetim Sistemi