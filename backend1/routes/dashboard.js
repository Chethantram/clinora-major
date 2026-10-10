const express = require('express');
const { getDashboardData } = require('../repositories/clinicalRepository');

const router = express.Router();

router.get('/data', async (_req, res) => {
  try {
    const dashboard = await getDashboardData();
    return res.json(dashboard);
  } catch (error) {
    console.error('Dashboard data request failed:', error.message);
    return res.status(503).json({ error: 'Dashboard data is temporarily unavailable' });
  }
});

module.exports = router;