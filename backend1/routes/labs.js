const express = require('express');
const { getLabResults } = require('../repositories/clinicalRepository');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await getLabResults());
  } catch (error) {
    console.error('Lab results request failed:', error.message);
    return res.status(503).json({ error: 'Lab results are temporarily unavailable' });
  }
});

module.exports = router;