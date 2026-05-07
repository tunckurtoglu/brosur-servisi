// ============================================
// server.js — Broşür Servisi Ana Dosyası
// ============================================

// 1. Gerekli kütüphaneleri içeri al (import)
const express = require('express');           // Web sunucusu
const cors = require('cors');                 // Cross-Origin izinleri
require('dotenv').config();                   // .env dosyasını oku

// 2. Express uygulamasını oluştur
const app = express();

// 3. Port belirle (.env'den oku, yoksa 5001 kullan)
const PORT = process.env.PORT || 5001;

// 4. Middleware'ler
app.use(cors());                              // Tüm origin'lerden istek kabul et
app.use(express.json());                      // JSON body'leri parse et
app.use(express.urlencoded({ extended: true })); // Form verilerini parse et

// 5. Statik dosya servisi
// Üretilen broşürlere /brochures/ url'i ile erişilebilsin
app.use('/brochures', express.static('storage/brochures'));

// 6. Test endpoint'i — sunucu çalışıyor mu kontrol etmek için
app.get('/', (req, res) => {
  res.json({
    service: 'Broşür Servisi',
    status: 'çalışıyor',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 7. Route'ları bağla (henüz yazmadık, sonra ekleyeceğiz)
 const brochureRoutes = require('./routes/brochureRoutes');
 app.use('/api/brochure', brochureRoutes);

// 8. Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Broşür servisi çalışıyor: http://localhost:${PORT}`);
  console.log(`📋 Test için tarayıcıdan aç: http://localhost:${PORT}`);
});