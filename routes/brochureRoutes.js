// ============================================
// routes/brochureRoutes.js
// API endpoint'lerini controller fonksiyonlarına yönlendirir
// ============================================

const express = require('express');
const router = express.Router();

const {
  createBrochure,
  getBrochure,
  regenerateBrochure,
  listTemplates
} = require('../controllers/brochureController');

// Template'leri listele (en spesifik route ÜSTTE olmalı)
// GET /api/brochure/templates
router.get('/templates', listTemplates);

// Yeni broşür üret
// POST /api/brochure/generate
router.post('/generate', createBrochure);

// Broşürü yenile
// POST /api/brochure/regenerate
router.post('/regenerate', regenerateBrochure);

// Restoran broşür bilgisi (en genel route EN ALTTA)
// GET /api/brochure/:restaurantId
router.get('/:restaurantId', getBrochure);

module.exports = router;