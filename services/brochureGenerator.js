// ============================================
// services/brochureGenerator.js
// Tüm servisleri orkestra eden ana broşür üretici
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
 * RGB PDF'i Ghostscript ile CMYK'ya çevirir (matbaa baskısı için).
 * Ghostscript yoksa veya hata varsa orijinal RGB PDF'i bırakır.
 */
function convertToCMYK(pdfPath) {
  try {
    const tmpPath = pdfPath.replace(/\.pdf$/, '_cmyk.pdf');
    const cmd = [
      'gs',
      '-dNOPAUSE', '-dBATCH', '-dQUIET',
      '-sDEVICE=pdfwrite',
      '-dProcessColorModel=/DeviceCMYK',
      '-sColorConversionStrategy=CMYK',
      '-sColorConversionStrategyForImages=CMYK',
      '-dPDFSETTINGS=/prepress',
      `-sOutputFile=${tmpPath}`,
      pdfPath
    ].join(' ');

    execSync(cmd, { stdio: 'pipe' });

    // CMYK çıktısı başarılıysa orijinal yerine koy
    if (fs.existsSync(tmpPath)) {
      fs.renameSync(tmpPath, pdfPath);
      console.log('CMYK donusumu tamamlandi: ' + pdfPath);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('CMYK donusumu basarisiz, RGB birakildi: ' + err.message);
    return false;
  }
}

/**
 * Font dosyalarını base64'e çevirip CSS içindeki url() referanslarını
 * data URI ile değiştirir.
 */
function inlineFonts(css, templatePath) {
  return css.replace(
    /url\((['"]?)(fonts\/[^'")]+)\1\)/g,
    function(match, quote, fontPath) {
      try {
        const fullPath = path.join(templatePath, fontPath);
        if (!fs.existsSync(fullPath)) {
          console.warn('Font bulunamadi: ' + fullPath);
          return match;
        }
        const fontData = fs.readFileSync(fullPath);
        const base64 = fontData.toString('base64');
        const ext = path.extname(fontPath).slice(1);
        const mime = ext === 'woff2' ? 'font/woff2' : 'font/woff';
        return 'url(data:' + mime + ';base64,' + base64 + ')';
      } catch (err) {
        console.warn('Font gomulemedi: ' + err.message);
        return match;
      }
    }
  );
}

function injectCSS(html, css, templatePath) {
  const cssWithFonts = templatePath ? inlineFonts(css, templatePath) : css;
  let cleanHtml = html.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,
    ''
  );
  const styleTag = '<style>\n' + cssWithFonts + '\n</style>';
  cleanHtml = cleanHtml.replace('</head>', styleTag + '\n</head>');
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
  const htmlWithCSS = injectCSS(template.html, template.css, template.path);

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

  // RGB → CMYK donusumu (matbaa baskisi icin)
  convertToCMYK(pdfPath);

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