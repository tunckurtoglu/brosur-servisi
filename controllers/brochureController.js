// ============================================
// controllers/brochureController.js
// API isteklerinin iş mantığını yöneten controller
// ============================================

const fs = require('fs');
const path = require('path');

const { generateBrochure } = require('../services/brochureGenerator');
const { listTemplates: getAllTemplates, templateExists } = require('../services/templateLoader');

const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'brochures');

/**
 * POST /api/brochure/generate
 * Yeni bir broşür üretir.
 *
 * Body örneği:
 * {
 *   "id": 1,
 *   "restaurantName": "Pideci Kemal Usta",
 *   "tagline": "Yöresel Tatlar",
 *   "logo": "https://...",
 *   "mainImage": "https://...",
 *   "secondaryImage": "https://...",
 *   "qrUrl": "https://kutyemek.com/r/1",
 *   "templateId": "classic-yellow"  // opsiyonel
 * }
 */
async function createBrochure(req, res) {
  try {
    const {
      id,
      restaurantName,
      tagline,
      logo,
      mainImage,
      secondaryImage,
      qrUrl,
      templateId
    } = req.body;

    // Temel validasyon
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'restoran id zorunlu'
      });
    }

    // Template id verilmişse, var mı kontrol et
    if (templateId && !templateExists(templateId)) {
      return res.status(404).json({
        success: false,
        error: `Template bulunamadı: ${templateId}`
      });
    }

    // Broşürü üret
    const result = await generateBrochure(
      { id, restaurantName, tagline, logo, mainImage, secondaryImage, qrUrl },
      templateId || 'classic-yellow'
    );

    return res.status(201).json({
      success: true,
      message: 'Broşür başarıyla oluşturuldu',
      data: {
        restaurantId: id,
        pdfUrl: result.pdfUrl,
        pngUrl: result.pngUrl,
        templateUsed: result.templateUsed,
        generatedAt: result.generatedAt
      }
    });

  } catch (error) {
    console.error('createBrochure hatası:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/brochure/:restaurantId
 * Bir restoranın broşür bilgilerini döner.
 */
async function getBrochure(req, res) {
  try {
    const { restaurantId } = req.params;

    const pdfPath = path.join(STORAGE_DIR, `restaurant_${restaurantId}.pdf`);
    const pngPath = path.join(STORAGE_DIR, `restaurant_${restaurantId}.png`);

    const pdfExists = fs.existsSync(pdfPath);
    const pngExists = fs.existsSync(pngPath);

    if (!pdfExists && !pngExists) {
      return res.status(404).json({
        success: false,
        error: 'Bu restoran için broşür bulunamadı'
      });
    }

    // Dosya bilgilerini al
    const pdfStats = pdfExists ? fs.statSync(pdfPath) : null;
    const pngStats = pngExists ? fs.statSync(pngPath) : null;

    return res.status(200).json({
      success: true,
      data: {
        restaurantId,
        pdfUrl: pdfExists ? `/brochures/restaurant_${restaurantId}.pdf` : null,
        pngUrl: pngExists ? `/brochures/restaurant_${restaurantId}.png` : null,
        pdfSize: pdfStats ? pdfStats.size : null,
        pngSize: pngStats ? pngStats.size : null,
        lastGenerated: pdfStats ? pdfStats.mtime : pngStats.mtime
      }
    });

  } catch (error) {
    console.error('getBrochure hatası:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/brochure/regenerate
 * Mevcut bir broşürü yeniden üretir (createBrochure ile aynı şey,
 * sadece semantik olarak farklı endpoint — "yenile" butonu için).
 */
async function regenerateBrochure(req, res) {
  // Aynı işi yapıyor — sadece farklı bir endpoint adı
  return createBrochure(req, res);
}

/**
 * GET /api/brochure/templates
 * Mevcut tüm template'leri listeler.
 * (Yönetim panelinde "tema seç" dropdown'u için)
 */
async function listTemplates(req, res) {
  try {
    const templates = getAllTemplates();
    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('listTemplates hatası:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  createBrochure,
  getBrochure,
  regenerateBrochure,
  listTemplates
};