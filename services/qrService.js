// ============================================
// services/qrService.js
// QR Kod oluşturma servisi
// ============================================

const QRCode = require('qrcode');

/**
 * Verilen URL için base64 formatında QR kod üretir.
 * @param {string} url - QR koda gömülecek link (ör: https://restoran.com/r/123)
 * @param {object} options - Opsiyonel ayarlar
 * @returns {Promise<string>} - "data:image/png;base64,iVBORw0KGgo..." formatında string
 */
async function generateQRCode(url, options = {}) {

  // URL boş mu kontrol et
  if (!url || typeof url !== 'string') {
    throw new Error('QR kod oluşturmak için geçerli bir URL gerekli');
  }

  // Varsayılan ayarlar — broşürdeki QR koda uygun
  const defaultOptions = {
    errorCorrectionLevel: 'M',  // Hata düzeltme seviyesi (L/M/Q/H)
    type: 'image/png',
    width: 600,                 // Yüksek çözünürlük (baskı için)
    margin: 1,                  // QR çevresindeki boşluk
    color: {
      dark: '#000000',          // QR'ın koyu kısımları (siyah)
      light: '#FFFFFF'          // Arka plan (beyaz)
    }
  };

  // Kullanıcının verdiği ayarları varsayılanın üstüne yaz
  const finalOptions = { ...defaultOptions, ...options };

  try {
    // QR kodu base64 string olarak üret
    const qrDataUrl = await QRCode.toDataURL(url, finalOptions);
    return qrDataUrl;
  } catch (error) {
    console.error('QR kod oluşturulurken hata:', error);
    throw new Error(`QR kod oluşturulamadı: ${error.message}`);
  }
}

// Bu fonksiyonu dışa aç ki başka dosyalardan kullanabilelim
module.exports = {
  generateQRCode
};