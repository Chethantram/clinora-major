const express = require('express');
const { createPatient, listPatients } = require('../repositories/clinicalRepository');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_GENDERS = new Set(['Unknown', 'Female', 'Male', 'Other']);

function splitValues(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const normalized = values.map((item) => String(item).trim()).filter(Boolean);
  if (normalized.length > 20 || normalized.some((item) => item.length > 160)) {
    throw new Error('Enter up to 20 diagnoses or allergies, each 160 characters or fewer');
  }
  return normalized;
}

function normalizePatientInput(body = {}) {
  const name = String(body.name || '').trim();
  const age = body.age === '' || body.age == null ? null : Number(body.age);
  const gender = String(body.gender || 'Unknown').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const bloodGroup = String(body.blood_group || '').trim();

  if (!name || name.length > 120) throw new Error('Name is required and must be 120 characters or fewer');
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) {
    throw new Error('Age must be a whole number between 0 and 130');
  }
  if (!VALID_GENDERS.has(gender)) throw new Error('Select a valid gender option');
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) throw new Error('Enter a valid email address');
  if (phone.length > 32) throw new Error('Phone must be 32 characters or fewer');
  if (bloodGroup.length > 12) throw new Error('Blood group must be 12 characters or fewer');

  const diagnosis = splitValues(body.diagnosis);
  const allergies = splitValues(body.allergies);

  return {
    name,
    age,
    gender,
    email: email || null,
    phone: phone || null,
    blood_group: bloodGroup || null,
    diagnosis,
    allergies,
  };
}

router.get('/', async (_req, res) => {
  try {
    return res.json(await listPatients());
  } catch (error) {
    console.error('Patient list request failed:', error.message);
    return res.status(503).json({ error: 'Patient records are temporarily unavailable' });
  }
});

router.post('/', async (req, res) => {
  let input;
  try {
    input = normalizePatientInput(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const patient = await createPatient(input);
    return res.status(201).json({ patient });
  } catch (error) {
    console.error('Patient creation failed:', error.message);
    return res.status(503).json({ error: 'Patient could not be saved. Please try again.' });
  }
});

module.exports = router;