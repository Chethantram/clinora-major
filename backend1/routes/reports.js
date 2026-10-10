const express = require('express');
const { getReportData } = require('../repositories/clinicalRepository');

const router = express.Router();

router.get('/data', async (_req, res) => {
  try {
    return res.json(await getReportData());
  } catch (error) {
    console.error('Report data request failed:', error.message);
    return res.status(503).json({ error: 'Report data is temporarily unavailable' });
  }
});

module.exports = router;