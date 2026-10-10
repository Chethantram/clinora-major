const express = require('express');
const { getAlerts } = require('../repositories/clinicalRepository');

const router = express.Router();

function normalizeSeverity(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['critical', 'high', 'urgent', 'severe', 'danger'].includes(normalized)) return 'high';
  if (['moderate', 'medium', 'warning', 'monitoring'].includes(normalized)) return 'medium';
  return 'low';
}

function normalizeType(value, message) {
  const normalized = `${value || ''} ${message || ''}`.trim().toLowerCase();
  if (normalized.includes('drug')) return 'drug_interaction';
  if (normalized.includes('overdue') || normalized.includes('test')) return 'test_overdue';
  if (normalized.includes('critical') || normalized.includes('lab')) return 'critical_value';
  return 'pattern';
}

router.get('/', async (_req, res) => {
  try {
    const alerts = await getAlerts();
    return res.json(alerts.map((alert) => ({
      id: String(alert.id),
      patient_id: String(alert.patient_id || ''),
      patient_name: alert.patient_name,
      severity: normalizeSeverity(alert.severity),
      type: normalizeType(alert.type, alert.message),
      message: String(alert.message || 'Clinical alert'),
      timestamp: alert.timestamp,
      evidence: alert.evidence,
      recommendation: alert.recommendation,
    })));
  } catch (error) {
    console.error('Alert list request failed:', error.message);
    return res.status(503).json({ error: 'Alert data is temporarily unavailable' });
  }
});

module.exports = router;
