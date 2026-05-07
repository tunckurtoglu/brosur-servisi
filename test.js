// test.js — Broşür generator'ı test eder

const { generateBrochure } = require('./services/brochureGenerator');

// Sahte restoran verisi (gerçek bir broşür üretmek için)
const testRestaurant = {
  id: 1,
  restaurantName: 'Pideci Kemal Usta',
  tagline: 'Yöresel Tatlar',

  // Test için internetten görseller kullanıyoruz
  logo: 'https://via.placeholder.com/220x140/8b1a1a/ffd633?text=KEMAL+USTA',
  mainImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900',
  secondaryImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',

  // QR'a gömülecek link
  qrUrl: 'https://kutyemek.com/r/1'
};

console.log('🚀 Broşür üretiliyor...\n');

generateBrochure(testRestaurant)
  .then(result => {
    console.log('✅ BAŞARILI!\n');
    console.log('PDF:', result.pdfPath);
    console.log('PNG:', result.pngPath);
    console.log('PDF URL:', result.pdfUrl);
    console.log('PNG URL:', result.pngUrl);
    console.log('Template:', result.templateUsed);
    console.log('\nDosyaları storage/brochures/ klasöründen kontrol et.');
  })
  .catch(err => {
    console.error('❌ HATA:', err.message);
    console.error(err.stack);
  });