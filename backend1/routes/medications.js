const express = require('express');
const {
  createPrescription,
  getMedicationOverview,
  updateMedication,
} = require('../repositories/clinicalRepository');

const router = express.Router();

function normalizeMedicationInput(body = {}, prescribedBy) {
  body = body || {};
  const input = {
    patient_id: String(body.patient_id || '').trim(),
    drug: String(body.drug || '').trim(),
    dose: String(body.dose || '').trim(),
    frequency: String(body.frequency || '').trim(),
    start_date: String(body.start_date || '').trim(),
    prescribed_by: prescribedBy || null,
  };

  if (!input.patient_id || !input.drug || !input.dose || !input.frequency) {
    return { error: 'Patient, medication, dose, and frequency are required' };
  }
  if (input.patient_id.length > 40 || input.drug.length > 120 || input.dose.length > 80 || input.frequency.length > 120) {
    return { error: 'One or more prescription fields exceed the allowed length' };
  }
  if (input.start_date && Number.isNaN(Date.parse(input.start_date))) {
    return { error: 'Enter a valid prescription start date' };
  }

  return { input };
}

router.get('/', async (_req, res) => {
  try {
    return res.json(await getMedicationOverview());
  } catch (error) {
    console.error('Medication overview request failed:', error.message);
    return res.status(503).json({ error: 'Medication data is temporarily unavailable' });
  }
});

router.post('/prescriptions', async (req, res) => {
  const { input, error } = normalizeMedicationInput(req.body, req.user?.name);
  if (error) return res.status(400).json({ error });

  try {
    return res.status(201).json({ prescription: await createPrescription(input) });
  } catch (requestError) {
    console.error('Prescription creation failed:', requestError.message);
    return res.status(503).json({ error: 'Prescription could not be saved. Please try again.' });
  }
});

router.put('/:id', async (req, res) => {
  const { input, error } = normalizeMedicationInput(req.body, req.user?.name);
  if (error) return res.status(400).json({ error });
  const recordType = req.body?.record_type === 'medication' ? 'medication' : 'prescription';

  try {
    const medication = await updateMedication(req.params.id, input, recordType);
    if (!medication) return res.status(404).json({ error: 'Medication record not found' });
    return res.json({ medication });
  } catch (requestError) {
    console.error('Medication update failed:', requestError.message);
    return res.status(503).json({ error: 'Medication record could not be updated. Please try again.' });
  }
});

module.exports = router;