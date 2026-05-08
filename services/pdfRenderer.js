// ============================================
// services/pdfRenderer.js
// HTML'i PDF/PNG'ye dönüştüren servis (Puppeteer)
// ============================================

const puppeteer = require('puppeteer');

/**
 * HTML string'ini PDF buffer'ına dönüştürür.
 * @param {string} htmlContent - Render edilecek tam HTML (CSS gömülü)
 * @param {object} options - PDF ayarları
 * @returns {Promise<Buffer>} - PDF dosyasının binary verisi
 */
async function renderToPDF(htmlContent, options = {}) {
  let browser = null;

  try {
    // 1. Chrome tarayıcısını başlat (headless = görünmez mod)
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // 2. Yeni bir sekme aç
    const page = await browser.newPage();

    // 3. HTML içeriğini sekmeye yükle
    // waitUntil: 'networkidle0' = tüm görseller/fontlar yüklenene kadar bekle
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000  // 30 saniye timeout
    });

    // 4. PDF ayarları (varsayılan + kullanıcının verdikleri)
    const pdfOptions = {
      width: '154mm',
      height: '216mm',
      printBackground: true,    // Arka plan renklerini ve görselleri PDF'e dahil et
      preferCSSPageSize: true,  // CSS @page kuralını kullan
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      ...options
    };

    // 5. PDF üret
    const pdfBuffer = await page.pdf(pdfOptions);

    return pdfBuffer;

  } catch (error) {
    console.error('PDF render hatası:', error);
    throw new Error(`PDF oluşturulamadı: ${error.message}`);
  } finally {
    // 6. Tarayıcıyı her durumda kapat (hata olsa bile)
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * HTML string'ini PNG buffer'ına dönüştürür.
 * @param {string} htmlContent - Render edilecek tam HTML
 * @param {object} options - PNG ayarları
 * @returns {Promise<Buffer>} - PNG dosyasının binary verisi
 */
async function renderToPNG(htmlContent, options = {}) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    // A4 boyutunda viewport ayarla (210mm × 297mm @ 96dpi ≈ 794 × 1123)
    // 2x ölçek = yüksek çözünürlük (Retina kalitesi)
    await page.setViewport({
      width: 1819,
      height: 2551,
      deviceScaleFactor: 1
    });

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // .flyer veya .brochure elementinin tam koordinatlarini al,
    // screenshot'i sadece o alanla sinirla
    const elementHandle = await page.$('.flyer, .brochure');
    let pngBuffer;
    if (elementHandle) {
      const box = await elementHandle.boundingBox();
      pngBuffer = await page.screenshot({
        type: 'png',
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        },
        omitBackground: false,
        ...options
      });
    } else {
      pngBuffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        omitBackground: false,
        ...options
      });
    }

    return pngBuffer;

  } catch (error) {
    console.error('PNG render hatası:', error);
    throw new Error(`PNG oluşturulamadı: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  renderToPDF,
  renderToPNG
};