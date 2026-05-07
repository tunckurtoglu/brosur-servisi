// ============================================
// services/templateLoader.js
// Template (şablon) yükleme servisi
// ============================================

const fs = require('fs');
const path = require('path');

// Template'lerin bulunduğu ana klasör
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Mevcut tüm template'lerin listesini döndürür.
 * @returns {Array<object>} - Template config'lerinin listesi
 */
function listTemplates() {
  try {
    // templates/ klasöründeki tüm öğeleri oku
    const items = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true });

    // Sadece klasörleri al (dosyaları ele)
    const folders = items.filter(item => item.isDirectory());

    // Her klasörün config.json'unu oku
    const templates = folders.map(folder => {
      const configPath = path.join(TEMPLATES_DIR, folder.name, 'config.json');

      // config.json yoksa atla
      if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ ${folder.name} klasöründe config.json bulunamadı`);
        return null;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    });

    // null olanları filtrele
    return templates.filter(t => t !== null);
  } catch (error) {
    console.error('Template listesi alınırken hata:', error);
    return [];
  }
}

/**
 * Belirli bir template'i diskten okur ve içeriğini döndürür.
 * @param {string} templateId - Template kimliği (ör: "classic-yellow")
 * @returns {object} - { html, css, config, path }
 */
function getTemplate(templateId) {
  // Güvenlik kontrolü: templateId içinde "../" gibi tehlikeli karakter olmasın
  if (!templateId || templateId.includes('..') || templateId.includes('/')) {
    throw new Error(`Geçersiz template id: ${templateId}`);
  }

  const templatePath = path.join(TEMPLATES_DIR, templateId);

  // Klasör var mı?
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template bulunamadı: ${templateId}`);
  }

  // 3 dosyayı oku
  const htmlPath = path.join(templatePath, 'template.hbs');
  const cssPath = path.join(templatePath, 'styles.css');
  const configPath = path.join(templatePath, 'config.json');

  // Dosyalar mevcut mu?
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`template.hbs bulunamadı: ${templateId}`);
  }
  if (!fs.existsSync(cssPath)) {
    throw new Error(`styles.css bulunamadı: ${templateId}`);
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json bulunamadı: ${templateId}`);
  }

  // İçerikleri oku
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  return {
    html,
    css,
    config,
    path: templatePath
  };
}

/**
 * Bir template var mı kontrol eder.
 * @param {string} templateId - Template kimliği
 * @returns {boolean}
 */
function templateExists(templateId) {
  if (!templateId || templateId.includes('..') || templateId.includes('/')) {
    return false;
  }
  const templatePath = path.join(TEMPLATES_DIR, templateId);
  return fs.existsSync(templatePath);
}

module.exports = {
  listTemplates,
  getTemplate,
  templateExists
};