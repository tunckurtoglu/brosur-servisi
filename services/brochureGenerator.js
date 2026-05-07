// ============================================
// services/brochureGenerator.js
// Tüm servisleri orkestra eden ana broşür üretici
// ============================================

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const { generateQRCode } = require('./qrService');
const { getTemplate } = require('./templateLoader');
const { renderToPDF, renderToPNG } = require('./pdfRenderer');

// Üretilen broşürlerin kaydedileceği klasör
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'brochures');

/**
 * Klasörün var olduğundan emin ol, yoksa oluştur
 */
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Restoran verisinin eksik alan içerip içermediğini kontrol eder.
 * @param {object} data - Restoran verisi
 * @param {Array<string>} requiredFields - Template'in istediği alanlar
 */
function validateRestaurantData(data, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    // qrCode bizim üreteceğimiz, kullanıcıdan beklemiyoruz
    if (field === 'qrCode') continue;

    if (!data[field]) {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Eksik alanlar: ${missing.join(', ')}`);
  }
}

/**
 * CSS'i HTML'in <head> bölümüne <style> olarak gömer
 * (link rel="stylesheet" satırını kaldırır)
 */
function injectCSS(html, css) {
  // Mevcut <link rel="stylesheet"...> satırını kaldır
  let cleanHtml = html.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,
    ''
  );

  // CSS'i <head> kapanışından önce göm
  const styleTag = `<style>\n${css}\n</style>`;
  cleanHtml = cleanHtml.replace('</head>', `${styleTag}\n</head>`);

  return cleanHtml;
}

/**
 * Restoran için broşür üretir.
 *
 * @param {object} restaurantData - Restoran bilgileri
 *   - id: restoran kimliği (zorunlu, dosya adı için)
 *   - restaurantName: restoran adı
 *   - tagline: alt slogan
 *   - logo: logo URL'i veya base64
 *   - mainImage: ana yemek görseli
 *   - secondaryImage: ikinci görsel
 *   - qrUrl: QR koda gömülecek link (örn: https://kutyemek.com/r/123)
 * @param {string} templateId - Kullanılacak template (varsayılan: 'classic-yellow')
 * @returns {Promise<object>} - { pdfUrl, pngUrl, pdfPath, pngPath }
 */
async function generateBrochure(restaurantData, templateId = 'classic-yellow') {

  // 1. Restoran ID kontrolü (dosya adı için lazım)
  if (!restaurantData.id) {
    throw new Error('restaurantData.id zorunlu');
  }

  // 2. QR linki kontrolü
  if (!restaurantData.qrUrl) {
    throw new Error('restaurantData.qrUrl zorunlu (QR koda gömülecek link)');
  }

  // 3. Storage klasörünü hazırla
  ensureStorageDir();

  // 4. Template'i yükle
  const template = getTemplate(templateId);

  // 5. Restoran verisini doğrula
  validateRestaurantData(restaurantData, template.config.requiredFields);

  // 6. QR kodu üret (base64)
  const qrCode = await generateQRCode(restaurantData.qrUrl);

  // 7. Handlebars'a beslenecek veriyi hazırla
  const templateData = {
    restaurantName: restaurantData.restaurantName,
    tagline: restaurantData.tagline,
    logo: restaurantData.logo,
    mainImage: restaurantData.mainImage,
    secondaryImage: restaurantData.secondaryImage,
    qrCode: qrCode  // base64 data URL
  };

  // 8. CSS'i HTML'e göm
  const htmlWithCSS = injectCSS(template.html, template.css);

  // 9. Handlebars ile {{...}} alanlarını doldur
  const compiledTemplate = Handlebars.compile(htmlWithCSS);
  const finalHtml = compiledTemplate(templateData);

  // 10. PDF ve PNG'yi paralel üret (ikisini aynı anda yapmak hızlandırır)
  const [pdfBuffer, pngBuffer] = await Promise.all([
    renderToPDF(finalHtml),
    renderToPNG(finalHtml)
  ]);

  // 11. Dosya adlarını oluştur
  const baseName = `restaurant_${restaurantData.id}`;
  const pdfFileName = `${baseName}.pdf`;
  const pngFileName = `${baseName}.png`;

  const pdfPath = path.join(STORAGE_DIR, pdfFileName);
  const pngPath = path.join(STORAGE_DIR, pngFileName);

  // 12. Diske yaz
  fs.writeFileSync(pdfPath, pdfBuffer);
  fs.writeFileSync(pngPath, pngBuffer);

  // 13. URL'leri döndür (server.js'te /brochures/ altında serve ediliyor)
  return {
    pdfUrl: `/brochures/${pdfFileName}`,
    pngUrl: `/brochures/${pngFileName}`,
    pdfPath,
    pngPath,
    templateUsed: templateId,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  generateBrochure
};