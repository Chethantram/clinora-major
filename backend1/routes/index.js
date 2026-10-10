const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
let MongoClient = null;
try {
  ({ MongoClient } = require('mongodb'));
} catch {
  MongoClient = null;
}

const tools = require('../tools/patientTools');
const { runAnalysisAgent } = require('../agents/analysisAgent');
const { runSecondOpinionAgent } = require('../agents/secondOpinionAgent');
const { runTriageAgent } = require('../agents/triageAgent');
const { runReceptionist } = require('../agents/receptionistAgent');
const { runNutritionAgent } = require('../agents/nutritionAgent');
const { runIngestionAgent } = require('../agents/ingestionAgent');
const { runTransferAgent } = require('../agents/transferAgent');
const { runRagPatientSummary, runRagDoctorQuery } = require('../agents/ragDoctorAgent');
const { getMongoDb, isMongoConfigured } = require('../db/mongo');
const {
  getPatientBundle,
  getReferenceData,
} = require('../repositories/clinicalRepository');
const blockchain = require('../blockchain/logger');

const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '../uploads/');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });
const uploadAny = multer({ dest: UPLOAD_DIR });
const DATA_DIR = path.join(__dirname, '../data');
const DRUG_INTERACTIONS_FILE = path.join(DATA_DIR, 'drug_interactions.json');
const LAB_TEST_ORDERS_FILE = path.join(DATA_DIR, 'lab_test_orders.json');
const PRESCRIPTIONS_FILE = path.join(DATA_DIR, 'prescriptions.json');
const DATASET_DIR = process.env.DATASET_DIR ? path.resolve(process.env.DATASET_DIR) : null;

function readJsonIfExists(baseDir, fileName) {
  const fullPath = path.join(baseDir, fileName);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readLabTestOrders() {
  if (!fs.existsSync(LAB_TEST_ORDERS_FILE)) return [];
  const value = JSON.parse(fs.readFileSync(LAB_TEST_ORDERS_FILE, 'utf8'));
  return Array.isArray(value) ? value : [];
}

function writeLabTestOrders(orders) {
  fs.writeFileSync(LAB_TEST_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function normalizeLabTestOrder(order) {
  return {
    id: String(order.id || order._id || ''),
    patient_id: String(order.patient_id || ''),
    test: String(order.test || ''),
    priority: String(order.priority || 'Routine'),
    notes: String(order.notes || ''),
    status: String(order.status || 'Requested'),
    created_at: order.created_at || order.createdAt || new Date().toISOString(),
    reviewed_at: order.reviewed_at || order.reviewedAt || null,
    reviewed_by: order.reviewed_by || order.reviewedBy || null,
    rejection_reason: order.rejection_reason || null,
  };
}

function readPrescriptions() {
  if (!fs.existsSync(PRESCRIPTIONS_FILE)) return [];
  const value = JSON.parse(fs.readFileSync(PRESCRIPTIONS_FILE, 'utf8'));
  return Array.isArray(value) ? value : [];
}

function writePrescriptions(prescriptions) {
  fs.writeFileSync(PRESCRIPTIONS_FILE, JSON.stringify(prescriptions, null, 2), 'utf8');
}

function normalizePrescription(medication) {
  return {
    med_id: String(medication.med_id || medication._id || ''),
    patient_id: String(medication.patient_id || '').trim().toUpperCase(),
    drug: String(medication.drug || medication.name || '').trim(),
    dose: String(medication.dose || medication.dosage || '').trim(),
    frequency: String(medication.frequency || '').trim(),
    start_date: medication.start_date || medication.startDate || new Date().toISOString().slice(0, 10),
    prescribed_by: medication.prescribed_by || medication.prescribedBy || null,
    created_at: medication.created_at || medication.createdAt || new Date().toISOString(),
  };
}

function datasetFilesAvailable() {
  if (!DATASET_DIR || !fs.existsSync(DATASET_DIR)) return false;
  const required = ['patients.json', 'visits.json', 'medications.json', 'labs.json'];
  return required.every((name) => fs.existsSync(path.join(DATASET_DIR, name)));
}

function normalizeDatasetSeverity(status = '') {
  const value = String(status).toLowerCase();
  if (value.includes('critical') || value.includes('high')) return 'high';
  if (value.includes('abnormal') || value.includes('borderline') || value.includes('monitor')) return 'medium';
  return 'low';
}

function statusFromSeverityBucket(maxSeverity) {
  if (maxSeverity === 'high') return 'critical';
  if (maxSeverity === 'medium') return 'monitoring';
  return 'stable';
}

function flattenLabResults(patient) {
  const labs = patient?.labResults || {};
  return Object.entries(labs).flatMap(([testName, rows]) =>
    (rows || []).map((row) => ({
      test: testName,
      value: row.value ?? row.systolic ?? null,
      unit: row.unit || (row.systolic ? 'mmHg' : ''),
      date: row.date,
      status: row.status || 'unknown',
      raw: row,
    }))
  );
}

function normalizeSeverity(type = '') {
  const upper = String(type).toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') return 'high';
  if (upper === 'MEDIUM') return 'medium';
  return 'low';
}

function derivePatientStatus(patient) {
  const flags = patient?.clinicalFlags || [];
  if (flags.some((f) => String(f.type).toUpperCase() === 'CRITICAL')) return 'critical';
  if (flags.some((f) => String(f.type).toUpperCase() === 'HIGH')) return 'monitoring';
  return 'stable';
}

function toNormalRange(range) {
  if (!range || typeof range !== 'string') return { min: 0, max: 0 };
  const gt = range.match(/^>(\\d+(?:\\.\\d+)?)$/);
  if (gt) return { min: Number(gt[1]), max: Number(gt[1]) };
  const lt = range.match(/^<(\\d+(?:\\.\\d+)?)$/);
  if (lt) return { min: 0, max: Number(lt[1]) };
  const dash = range.match(/(\\d+(?:\\.\\d+)?)\\s*[-–]\\s*(\\d+(?:\\.\\d+)?)/);
  if (dash) return { min: Number(dash[1]), max: Number(dash[2]) };
  return { min: 0, max: 0 };
}

function normalizeMongoLabSeverity(status = '') {
  const value = String(status || '').toLowerCase();
  if (value.includes('critical') || value.includes('high')) return 'high';
  if (value.includes('abnormal') || value.includes('borderline') || value.includes('monitor') || value.includes('low')) return 'medium';
  return 'low';
}

async function dashboardDataFromMongo() {
  if (!MongoClient || !process.env.MONGO_URI) {
    throw new Error('MongoDB is not configured');
  }

  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const dbName = String(process.env.MONGO_DB_NAME || '').trim();
    const db = dbName ? client.db(dbName) : client.db();

    const [rawPatients, rawVisits, rawMeds, rawLabs, rawAlerts] = await Promise.all([
      db
        .collection('patients')
        .find(
          {},
          {
            projection: {
              _id: 1,
              patient_id: 1,
              id: 1,
              name: 1,
              age: 1,
              gender: 1,
              diagnosis: 1,
              allergies: 1,
              email: 1,
              phone: 1,
              blood_group: 1,
              bmi: 1,
              city: 1,
              smoking: 1,
              alcohol: 1,
              status: 1,
              lastVisit: 1,
            },
          }
        )
        .toArray(),
      db.collection('visits').find({}).toArray(),
      db.collection('medications').find({}).toArray(),
      db.collection('labs').find({}).toArray(),
      db.collection('alerts').find({}).toArray(),
    ]);

    const visits = rawVisits.map((v) => ({
      patient_id: v.patient_id || null,
      date: v.date || null,
      doctor: v.doctor || '',
      department: v.department || '',
      visit_type: v.visit_type || v.visitType || '',
      doctor_notes: v.doctor_notes || v.clinicalNote || v.plan || '',
      symptoms: Array.isArray(v.symptoms)
        ? v.symptoms
        : v.chiefComplaint
        ? String(v.chiefComplaint).split(',').map((s) => s.trim())
        : [],
      bp_systolic: v.bp_systolic ?? v.bp?.systolic ?? null,
      bp_diastolic: v.bp_diastolic ?? v.bp?.diastolic ?? null,
      pulse_bpm: v.pulse_bpm ?? v.pulse ?? null,
      temperature_c: v.temperature_c ?? v.temperature ?? null,
      spo2_pct: v.spo2_pct ?? v.spo2 ?? null,
      weight_kg: v.weight_kg ?? v.weight ?? null,
    }));

    const medications = rawMeds.map((m) => ({
      patient_id: m.patient_id || null,
      drug: m.drug || m.name || '',
      dose: m.dose || m.dosage || '',
      frequency: m.frequency || '',
      route: m.route || '',
      start_date: m.start_date || m.since || null,
      end_date: m.end_date || null,
      active: m.active ?? true,
    }));

    const labResults = rawLabs.map((l) => ({
      patient_id: l.patient_id || null,
      test: l.test || l.test_name || '',
      value: l.value ?? null,
      unit: l.unit || '',
      date: l.date || null,
      status: l.status || 'unknown',
      normalRange: toNormalRange(l.normal_range || l.referenceRange || ''),
    }));

    const alertsFromCollection = rawAlerts.map((a) => ({
      id: String(a._id || `${a.patient_id}-${a.message || a.type || 'alert'}-${a.date || ''}`),
      patient_id: a.patient_id || null,
      type: a.type || 'alert',
      severity: normalizeSeverity(a.severity || a.type),
      message: a.message || a.title || a.type || 'Clinical alert',
      timestamp: a.date || a.timestamp || new Date().toISOString(),
    }));

    const derivedAlertsFromLabs = labResults
      .filter((l) => normalizeMongoLabSeverity(l.status) !== 'low')
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .map((l) => ({
        id: `${l.patient_id}-${l.test}-${l.date}`,
        patient_id: l.patient_id,
        type: 'lab',
        severity: normalizeMongoLabSeverity(l.status),
        message: `${l.test}: ${l.status} (${l.value ?? ''}${l.unit || ''})`,
        timestamp: l.date || new Date().toISOString(),
      }));

    const alerts = alertsFromCollection.length > 0 ? alertsFromCollection : derivedAlertsFromLabs;

    const latestVisitByPatient = visits.reduce((acc, v) => {
      if (!v.patient_id) return acc;
      const current = acc[v.patient_id];
      const nextTs = new Date(v.date || 0).getTime();
      const curTs = new Date(current || 0).getTime();
      if (!current || nextTs > curTs) acc[v.patient_id] = v.date;
      return acc;
    }, {});

    const maxSeverityByPatient = alerts.reduce((acc, a) => {
      if (!a.patient_id) return acc;
      const cur = acc[a.patient_id] || 'low';
      if (a.severity === 'high') acc[a.patient_id] = 'high';
      else if (a.severity === 'medium' && cur === 'low') acc[a.patient_id] = 'medium';
      return acc;
    }, {});

    const patients = rawPatients.map((p) => {
      const patientId = p.patient_id || p.id;
      const derivedStatus = maxSeverityByPatient[patientId] === 'high'
        ? 'critical'
        : maxSeverityByPatient[patientId] === 'medium'
        ? 'monitoring'
        : 'stable';

      return {
        _id: p._id || null,
        patient_id: patientId,
        name: p.name,
        email: p.email || `${String(p.name || 'patient').toLowerCase().replace(/\s+/g, '.')}@patient.local`,
        age: p.age ?? null,
        gender: p.gender ?? 'Unknown',
        diagnosis: p.diagnosis || [],
        allergies: p.allergies || [],
        phone: p.phone || null,
        blood_group: p.blood_group || null,
        bmi: p.bmi ?? null,
        city: p.city || null,
        smoking: p.smoking || null,
        alcohol: p.alcohol || null,
        status: p.status || derivedStatus,
        lastVisit: p.lastVisit || latestVisitByPatient[patientId] || null,
      };
    });

    return { patients, visits, medications, labResults, alerts, drugInteractions: [] };
  } finally {
    await client.close();
  }
}

function dashboardDataFromFiles() {
  if (datasetFilesAvailable()) {
    const rawPatients = readJsonIfExists(DATASET_DIR, 'patients.json') || [];
    const rawVisits = readJsonIfExists(DATASET_DIR, 'visits.json') || [];
    const rawMeds = readJsonIfExists(DATASET_DIR, 'medications.json') || [];
    const rawLabs = readJsonIfExists(DATASET_DIR, 'labs.json') || [];
    const rawDrugInteractions =
      readJsonIfExists(DATASET_DIR, 'drug_interactions.json') ||
      readJsonIfExists(DATA_DIR, 'drug_interactions.json') ||
      [];

    const visitsByPatient = rawVisits.reduce((acc, v) => {
      if (!acc[v.patient_id]) acc[v.patient_id] = [];
      acc[v.patient_id].push(v);
      return acc;
    }, {});
    const severityByPatient = rawLabs.reduce((acc, l) => {
      const sev = normalizeDatasetSeverity(l.status);
      const current = acc[l.patient_id];
      if (!current || (current === 'medium' && sev === 'high') || (current === 'low' && sev !== 'low')) {
        acc[l.patient_id] = sev;
      }
      return acc;
    }, {});

    const patients = rawPatients.map((p) => {
      const pVisits = (visitsByPatient[p.patient_id] || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const maxSeverity = severityByPatient[p.patient_id] || 'low';
      return {
        patient_id: p.patient_id,
        name: p.name,
        email: p.email || `${String(p.name || 'patient').toLowerCase().replace(/\s+/g, '.')}@patient.local`,
        age: p.age,
        gender: p.gender,
        diagnosis: p.diagnosis || [],
        allergies: p.allergies || [],
        status: statusFromSeverityBucket(maxSeverity),
        lastVisit: pVisits[0]?.date || null,
      };
    });

    const visits = rawVisits.map((v) => ({
      patient_id: v.patient_id,
      date: v.date,
      doctor: v.doctor || '',
      department: v.department || '',
      visit_type: v.visit_type || '',
      doctor_notes: v.doctor_notes || '',
      symptoms: Array.isArray(v.symptoms) ? v.symptoms : [],
      bp_systolic: v.bp_systolic ?? null,
      bp_diastolic: v.bp_diastolic ?? null,
      pulse_bpm: v.pulse_bpm ?? null,
      temperature_c: v.temperature_c ?? null,
      spo2_pct: v.spo2_pct ?? null,
      weight_kg: v.weight_kg ?? null,
    }));

    const medications = rawMeds.map((m) => ({
      patient_id: m.patient_id,
      drug: m.drug,
      dose: m.dose,
      frequency: m.frequency,
      start_date: m.start_date || null,
    }));

    const labResults = rawLabs.map((l) => ({
      patient_id: l.patient_id,
      test: l.test,
      value: l.value,
      unit: l.unit || '',
      date: l.date,
      normalRange: toNormalRange(l.normal_range),
    }));

    // Keep payload compact: latest 2 abnormal items per patient as alert feed.
    const abnormalByPatient = rawLabs
      .filter((l) => normalizeDatasetSeverity(l.status) !== 'low')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .reduce((acc, lab) => {
        if (!acc[lab.patient_id]) acc[lab.patient_id] = [];
        if (acc[lab.patient_id].length < 2) acc[lab.patient_id].push(lab);
        return acc;
      }, {});

    const alerts = Object.values(abnormalByPatient)
      .flat()
      .map((l) => ({
        id: l.lab_id || `${l.patient_id}-${l.test}-${l.date}`,
        patient_id: l.patient_id,
        type: 'lab',
        severity: normalizeDatasetSeverity(l.status),
        message: `${l.test}: ${l.status} (${l.value}${l.unit || ''})`,
        timestamp: l.date || new Date().toISOString(),
      }));

    const drugInteractions = (rawDrugInteractions || []).map((d) => ({
      drug_a: d.drug1 || d.drug_a,
      drug_b: d.drug2 || d.drug_b,
      severity: d.severity === 'CRITICAL' || d.severity === 'HIGH' ? 'High' : d.severity === 'MEDIUM' ? 'Moderate' : (d.severity || 'Low'),
      risk: d.risk || d.effect || '',
    }));

    return { patients, visits, medications, labResults, alerts, drugInteractions };
  }

  const files = fs.readdirSync(DATA_DIR).filter((name) => /^patient_.*\\.json$/i.test(name));
  const patientSheets = files.map((file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')));

  const patients = patientSheets.map((p) => ({
    patient_id: p.id,
    name: p.name,
    email: p.email || `${String(p.name || 'patient').toLowerCase().replace(/\\s+/g, '.')}@patient.local`,
    age: p.age,
    gender: p.gender,
    diagnosis: [...(p.primaryDiagnosis || []), ...(p.secondaryDiagnosis || [])],
    allergies: p.allergies || [],
    status: derivePatientStatus(p),
    lastVisit: p.visits?.length ? p.visits[p.visits.length - 1].date : null,
  }));

  const visits = patientSheets.flatMap((p) =>
    (p.visits || []).map((v) => ({
      patient_id: p.id,
      date: v.date,
      doctor: v.doctor || '',
      department: v.department || '',
      visit_type: v.visitType || '',
      doctor_notes: v.clinicalNote || v.plan || '',
      symptoms: v.chiefComplaint ? String(v.chiefComplaint).split(',').map((s) => s.trim()) : [],
      bp_systolic: v.bp?.systolic ?? null,
      bp_diastolic: v.bp?.diastolic ?? null,
      pulse_bpm: v.pulse ?? null,
      temperature_c: v.temperature ?? null,
      spo2_pct: v.spo2 ?? null,
      weight_kg: v.weight ?? null,
    }))
  );

  const medications = patientSheets.flatMap((p) =>
    (p.medications || []).map((m) => ({
      patient_id: p.id,
      drug: m.name,
      dose: m.dose,
      frequency: m.frequency,
      start_date: m.since || null,
    }))
  );

  const labResults = patientSheets.flatMap((p) =>
    Object.entries(p.labResults || {}).flatMap(([test, values]) =>
      (values || []).map((row) => ({
        patient_id: p.id,
        test,
        value: row.value ?? row.systolic ?? 0,
        unit: row.unit || (row.systolic ? 'mmHg' : ''),
        date: row.date,
        normalRange: toNormalRange(row.referenceRange),
      }))
    )
  );

  const alerts = patientSheets.flatMap((p) =>
    (p.clinicalFlags || []).map((f, idx) => ({
      id: `${p.id}-A${idx + 1}`,
      patient_id: p.id,
      type: 'pattern',
      severity: normalizeSeverity(f.type),
      message: f.flag,
      timestamp: p.visits?.length ? p.visits[p.visits.length - 1].date : new Date().toISOString(),
    }))
  );

  let drugInteractions = [];
  if (fs.existsSync(DRUG_INTERACTIONS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DRUG_INTERACTIONS_FILE, 'utf8'));
    drugInteractions = (raw || []).map((d) => ({
      drug_a: d.drug1,
      drug_b: d.drug2,
      severity: d.severity === 'CRITICAL' || d.severity === 'HIGH' ? 'High' : d.severity === 'MEDIUM' ? 'Moderate' : 'Low',
      risk: d.risk || d.effect || '',
    }));
  }

  return { patients, visits, medications, labResults, alerts, drugInteractions };
}

async function getPatientCaseFromMongo(patientId) {
  const bundle = await getPatientBundle(patientId);
  return bundle ? bundleToCase(bundle) : null;
}

function buildBriefFromCase(patient, patientId) {
  const safeVisits = Array.isArray(patient?.visits) ? patient.visits : [];
  const safeFlags = Array.isArray(patient?.clinicalFlags) ? patient.clinicalFlags : [];
  const safeLabs = patient?.labResults || {};
  const safeMeds = Array.isArray(patient?.medications) ? patient.medications : [];
  const lastVisit = safeVisits.length ? safeVisits[safeVisits.length - 1] : null;
  const recentLabs = {};
  Object.entries(safeLabs).forEach(([test, values]) => {
    recentLabs[test] = (values || []).slice(-3);
  });
  return {
    patientId,
    patientName: patient?.name || patientId,
    age: patient?.age ?? null,
    primaryDiagnosis: patient?.primaryDiagnosis || [],
    chiefComplaintHistory: safeVisits.map((v) => ({
      date: v.date,
      complaint: v.chiefComplaint,
      doctor: v.doctor,
    })),
    currentMedications: safeMeds,
    last3LabResults: recentLabs,
    redFlags: safeFlags.filter((f) => ['CRITICAL', 'HIGH'].includes(String(f.type || '').toUpperCase())),
    lastVisitSummary: lastVisit,
    allergies: patient?.allergies || [],
    overdueTests: patient?.overdueTests || [],
    generatedAt: new Date().toISOString(),
  };
}

function bundleToCase(bundle) {
  const diagnosis = bundle.patient.diagnosis || [];
  const labResults = bundle.labs.reduce((result, lab) => {
    if (!result[lab.test]) result[lab.test] = [];
    result[lab.test].push({
      date: lab.date,
      value: lab.value,
      unit: lab.unit,
      status: lab.status,
      referenceRange: lab.normal_range,
    });
    return result;
  }, {});
  return {
    id: bundle.patient.patient_id,
    ...bundle.patient,
    primaryDiagnosis: diagnosis.slice(0, 2),
    secondaryDiagnosis: diagnosis.slice(2),
    medications: bundle.medications.map((medication) => ({
      name: medication.drug,
      dose: medication.dose,
      frequency: medication.frequency,
      route: medication.route,
      since: medication.start_date,
      active: medication.active,
    })),
    labResults,
    clinicalFlags: bundle.alerts.map((alert) => ({
      type: String(alert.severity || 'LOW').toUpperCase(),
      flag: alert.message,
      date: alert.timestamp,
    })),
    visits: bundle.visits.map((visit) => ({
      date: visit.date,
      doctor: visit.doctor,
      department: visit.department,
      chiefComplaint: visit.symptoms.join(', '),
      clinicalNote: visit.doctor_notes,
      plan: visit.doctor_notes,
      symptoms: visit.symptoms,
    })),
    overdueTests: bundle.patient.overdueTests || [],
  };
}

router.get('/prescriptions', async (req, res) => {
  try {
    const patientId = String(req.query.patient_id || '').trim().toUpperCase();
    const prescriptions = isMongoConfigured()
      ? await (await getMongoDb()).collection('prescriptions').find(patientId ? { patient_id: patientId } : {}).sort({ created_at: -1 }).toArray()
      : readPrescriptions().filter((medication) => !patientId || String(medication.patient_id).toUpperCase() === patientId);
    return res.json({ prescriptions: prescriptions.map(normalizePrescription) });
  } catch (e) {
    return res.status(500).json({ error: `Failed to load prescriptions: ${e.message}` });
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const prescription = normalizePrescription({
      med_id: `MED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      patient_id: req.body.patient_id,
      drug: req.body.drug,
      dose: req.body.dose,
      frequency: req.body.frequency,
      start_date: req.body.start_date,
      prescribed_by: req.body.prescribed_by || req.headers['x-actor-id'] || 'Dashboard user',
      created_at: new Date().toISOString(),
    });
    if (!prescription.patient_id || !prescription.drug || !prescription.dose || !prescription.frequency) {
      return res.status(400).json({ error: 'patient_id, drug, dose, and frequency are required' });
    }

    if (isMongoConfigured()) {
      await (await getMongoDb()).collection('prescriptions').insertOne(prescription);
    } else {
      writePrescriptions([prescription, ...readPrescriptions()]);
    }
    blockchain.addBlock('CREATE_PRESCRIPTION', req.headers['x-actor-id'] || 'UNKNOWN', prescription.patient_id, `${prescription.drug} prescribed`);
    return res.status(201).json({ prescription });
  } catch (e) {
    return res.status(500).json({ error: `Failed to create prescription: ${e.message}` });
  }
});

router.put('/prescriptions/:id', async (req, res) => {
  try {
    const updates = normalizePrescription({
      patient_id: req.body.patient_id,
      drug: req.body.drug,
      dose: req.body.dose,
      frequency: req.body.frequency,
      start_date: req.body.start_date,
      prescribed_by: req.body.prescribed_by || req.headers['x-actor-id'] || 'Dashboard user',
    });
    if (!updates.patient_id || !updates.drug || !updates.dose || !updates.frequency) {
      return res.status(400).json({ error: 'patient_id, drug, dose, and frequency are required' });
    }

    let prescription;
    if (isMongoConfigured()) {
      const collection = (await getMongoDb()).collection('prescriptions');
      const result = await collection.updateOne(
        { med_id: req.params.id },
        { $set: { patient_id: updates.patient_id, drug: updates.drug, dose: updates.dose, frequency: updates.frequency, start_date: updates.start_date, prescribed_by: updates.prescribed_by, updated_at: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Prescription not found' });
      prescription = await collection.findOne({ med_id: req.params.id });
    } else {
      const prescriptions = readPrescriptions();
      const index = prescriptions.findIndex((item) => String(item.med_id) === String(req.params.id));
      if (index < 0) return res.status(404).json({ error: 'Prescription not found' });
      prescriptions[index] = { ...prescriptions[index], ...updates, med_id: prescriptions[index].med_id, updated_at: new Date().toISOString() };
      prescription = prescriptions[index];
      writePrescriptions(prescriptions);
    }

    blockchain.addBlock('UPDATE_PRESCRIPTION', req.headers['x-actor-id'] || 'UNKNOWN', updates.patient_id, `${updates.drug} prescription updated`);
    return res.json({ prescription: normalizePrescription(prescription) });
  } catch (e) {
    return res.status(500).json({ error: `Failed to update prescription: ${e.message}` });
  }
});

router.get('/lab-test-orders', async (req, res) => {
  try {
    const patientId = String(req.query.patient_id || '').trim().toUpperCase();
    const orders = isMongoConfigured()
      ? await (await getMongoDb()).collection('lab_test_orders').find(patientId ? { patient_id: patientId } : {}).sort({ created_at: -1 }).toArray()
      : readLabTestOrders().filter((order) => !patientId || String(order.patient_id).toUpperCase() === patientId);
    return res.json({ orders: orders.map(normalizeLabTestOrder) });
  } catch (e) {
    return res.status(500).json({ error: `Failed to load lab test orders: ${e.message}` });
  }
});

router.post('/lab-test-orders', async (req, res) => {
  try {
    const patientId = String(req.body.patient_id || '').trim().toUpperCase();
    const test = String(req.body.test || '').trim();
    if (!patientId || !test) return res.status(400).json({ error: 'patient_id and test are required' });

    const order = normalizeLabTestOrder({
      id: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      patient_id: patientId,
      test,
      priority: req.body.priority,
      notes: req.body.notes,
      status: 'Requested',
      created_at: new Date().toISOString(),
    });

    if (isMongoConfigured()) {
      await (await getMongoDb()).collection('lab_test_orders').insertOne(order);
    } else {
      writeLabTestOrders([order, ...readLabTestOrders()]);
    }
    blockchain.addBlock('CREATE_LAB_TEST_ORDER', req.headers['x-actor-id'] || 'UNKNOWN', patientId, `${test} test requested`);
    return res.status(201).json({ order });
  } catch (e) {
    return res.status(500).json({ error: `Failed to create lab test order: ${e.message}` });
  }
});

router.patch('/lab-test-orders/:id/status', async (req, res) => {
  try {
    const status = String(req.body.status || '').trim();
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'status must be Approved or Rejected' });
    const reviewedBy = String(req.body.reviewed_by || req.headers['x-actor-id'] || 'UNKNOWN');
    const reviewedAt = new Date().toISOString();
    const update = { status, reviewed_at: reviewedAt, reviewed_by: reviewedBy, rejection_reason: status === 'Rejected' ? String(req.body.rejection_reason || '') : null };
    let order;

    if (isMongoConfigured()) {
      const db = await getMongoDb();
      const collection = db.collection('lab_test_orders');
      const result = await collection.updateOne({ id: req.params.id }, { $set: update });
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Lab test order not found' });
      order = await collection.findOne({ id: req.params.id });
    } else {
      const orders = readLabTestOrders();
      const index = orders.findIndex((item) => String(item.id) === String(req.params.id));
      if (index < 0) return res.status(404).json({ error: 'Lab test order not found' });
      orders[index] = { ...orders[index], ...update };
      order = orders[index];
      writeLabTestOrders(orders);
    }

    if (!order) return res.status(404).json({ error: 'Lab test order not found' });
    blockchain.addBlock(`LAB_TEST_ORDER_${status.toUpperCase()}`, reviewedBy, order.patient_id, `${order.test} order ${status.toLowerCase()}`);
    return res.json({ order: normalizeLabTestOrder(order) });
  } catch (e) {
    return res.status(500).json({ error: `Failed to update lab test order: ${e.message}` });
  }
});

router.get('/patient/:id', async (req, res) => {
  try {
    const patient = await getPatientCaseFromMongo(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    blockchain.addBlock('VIEW_PATIENT_RECORD', req.headers['x-actor-id'] || 'UNKNOWN', req.params.id, 'Patient record accessed');
    return res.json(patient);
  } catch (e) {
    return res.status(500).json({ error: `Failed to load patient: ${e.message}` });
  }
});

router.get('/patient/:id/brief', async (req, res) => {
  try {
    const patient = await getPatientCaseFromMongo(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const brief = buildBriefFromCase(patient, req.params.id);
    blockchain.addBlock('GENERATE_BRIEF', req.headers['x-actor-id'] || 'SYSTEM', req.params.id, '60-second consultation brief generated');
    return res.json(brief);
  } catch (e) {
    return res.status(500).json({ error: `Failed to generate brief: ${e.message}` });
  }
});

router.get('/patient/:id/labs/:testName', async (req, res) => {
  try {
    const patient = await getPatientCaseFromMongo(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.labResults) {
      const testName = req.params.testName;
      const aliasMap = {
        SerumCreatinine: 'Creatinine',
        BloodPressure: 'Blood Pressure',
        Cholesterol: 'Total Cholesterol',
        Haemoglobin: 'Hemoglobin',
      };
      const normalizedTestName = patient.labResults[testName]
        ? testName
        : aliasMap[testName] || testName;
      const allRows = patient.labResults[normalizedTestName] || [];
      const from = req.query?.from ? new Date(req.query.from) : null;
      const to = req.query?.to ? new Date(req.query.to) : null;
      const data = allRows.filter((r) => {
        const d = new Date(r.date || 0);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      const values = data.map((r) => Number(r.value)).filter((v) => Number.isFinite(v));
      const trend =
        values.length > 1
          ? values[values.length - 1] > values[0]
            ? 'WORSENING'
            : values[values.length - 1] < values[0]
            ? 'IMPROVING'
            : 'STABLE'
          : 'INSUFFICIENT_DATA';
      const result = { test_name: normalizedTestName, data, trend, count: data.length };
      blockchain.addBlock('QUERY_LAB_TREND', req.headers['x-actor-id'] || 'UNKNOWN', req.params.id, `Lab trend queried: ${req.params.testName}`);
      return res.json(result);
    }

    return res.json({ test_name: req.params.testName, data: [], trend: 'INSUFFICIENT_DATA', count: 0 });
  } catch (e) {
    return res.status(500).json({ error: `Failed to load lab trend: ${e.message}` });
  }
});

router.get('/patient/:id/flags', async (req, res) => {
  try {
    const patient = await getPatientCaseFromMongo(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const typeFilter = String(req.query?.type || '').toUpperCase();
    const flags = (patient.clinicalFlags || []).filter((flag) =>
      !typeFilter || String(flag.type || '').toUpperCase().includes(typeFilter)
    );
    return res.json(flags);
  } catch (e) {
    return res.status(500).json({ error: `Failed to load flags: ${e.message}` });
  }
});

router.get('/patient/:id/overdue-tests', async (req, res) => {
  try {
    const patient = await getPatientCaseFromMongo(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const tests = patient.overdueTests || [];
    blockchain.addBlock('LAB_RECOMMENDATION', 'SYSTEM', req.params.id, 'Overdue lab tests surfaced');
    return res.json(tests);
  } catch (e) {
    return res.status(500).json({ error: `Failed to load overdue tests: ${e.message}` });
  }
});

// Frontend compatibility: /records/* aliases
router.get('/records/:id', async (req, res) => {
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  return res.json({
    patient_id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    diagnoses: [...(patient.primaryDiagnosis || []), ...(patient.secondaryDiagnosis || [])],
    allergies: patient.allergies || [],
    prescriptions: (patient.medications || []).map((m) => ({
      drug: m.name,
      dose: m.dose,
      frequency: m.frequency,
      start_date: m.since || null,
    })),
    visits: patient.visits || [],
  });
});

router.get('/records/:id/brief', async (req, res) => {
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.json(buildBriefFromCase(patient, req.params.id));
});

router.get('/records/:id/labs', async (req, res) => {
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.json(flattenLabResults(patient));
});

router.get('/records/:id/flags', async (req, res) => {
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const flags = patient.clinicalFlags.filter((flag) => !req.query.type || String(flag.type).toUpperCase().includes(String(req.query.type).toUpperCase()));
  const payload = flags.map((f, idx) => ({
    id: `${req.params.id}-F${idx + 1}`,
    severity: normalizeSeverity(f.type),
    message: f.flag,
    evidence: f.evidence,
    recommendation: f.recommendation,
  }));
  return res.json(payload);
});

router.get('/records/:id/overdue-tests', async (req, res) => {
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const tests = patient.overdueTests || [];
  return res.json(
    (tests || []).map((t) => ({
      test: t.test,
      priority: t.overdueDays > 20 ? 'high' : t.overdueDays > 7 ? 'medium' : 'low',
      reason: t.reason || 'Follow-up suggested',
      overdueDays: t.overdueDays ?? null,
      labUrl: t.labUrl || null,
    }))
  );
});

router.post('/records/search', async (req, res) => {
  const { query, patientId } = req.body || {};
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const patient = await getPatientCaseFromMongo(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const normalizedQuery = String(query || '').toLowerCase();
  const results = patient.visits
    .filter((visit) => JSON.stringify(visit).toLowerCase().includes(normalizedQuery))
    .map((visit) => ({ type: visit.department || 'Record', value: `${visit.date}: ${visit.clinicalNote || visit.symptoms.join(', ')}` }));
  return res.json(results);
});

router.post('/patient/:id/search', async (req, res) => {
  const { query } = req.body;
  const patient = await getPatientCaseFromMongo(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const normalizedQuery = String(query || '').toLowerCase();
  const results = patient.visits.filter((visit) => JSON.stringify(visit).toLowerCase().includes(normalizedQuery));
  blockchain.addBlock('HISTORY_SEARCH', req.headers['x-actor-id'] || 'UNKNOWN', req.params.id, `History searched: "${query}"`);
  return res.json({ query: query || '', results, found: results.length > 0 });
});

router.post('/drugs/check', async (req, res) => {
  const { medications } = req.body;
  if (!Array.isArray(medications) || medications.length === 0) {
    return res.status(400).json({ error: 'medications array required' });
  }
  let result;
  if (isMongoConfigured()) {
    const interactions = await getReferenceData('drug_interactions');
    const normalized = medications.map((medication) => String(medication).toLowerCase());
    const found = interactions.filter((entry) => {
      const first = String(entry.drug1 || entry.drug_a || '').toLowerCase();
      const second = String(entry.drug2 || entry.drug_b || '').toLowerCase();
      return normalized.some((medication, index) => normalized.slice(index + 1).some((other) =>
        (medication.includes(first) && other.includes(second)) ||
        (medication.includes(second) && other.includes(first))
      ));
    });
    result = { interactions: found, count: found.length, hasCritical: found.some((entry) => String(entry.severity).toUpperCase() === 'CRITICAL') };
  } else {
    result = tools.check_drug_interactions(medications);
  }
  blockchain.addBlock('CHECK_DRUG_INTERACTION', req.headers['x-actor-id'] || 'SYSTEM', req.body.patientId || 'UNKNOWN', `Drug interactions checked: ${medications.join(', ')}`);
  return res.json(result);
});

router.get('/pharmacy/:medicineName', (req, res) => {
  const links = tools.get_pharmacy_link(req.params.medicineName);
  blockchain.addBlock('PHARMACY_LINK_ACCESS', req.headers['x-actor-id'] || 'UNKNOWN', null, `Pharmacy links accessed: ${req.params.medicineName}`);
  return res.json(links);
});

router.post('/agent/query', async (req, res) => {
  const { patientId, query, prompt, apiKey, model, allPatients } = req.body;
  const normalizedQuery = query || prompt;
  if (!normalizedQuery) return res.status(400).json({ error: 'query/prompt required' });
  // A selected patient is authoritative even if an older client sends a stale allPatients flag.
  const effectivePatientId = patientId ? String(patientId).trim() : allPatients ? 'all-patients' : undefined;

  blockchain.addBlock('NL_QUERY', req.headers['x-actor-id'] || 'UNKNOWN', effectivePatientId || 'UNKNOWN', `NL Query: "${normalizedQuery.substring(0, 80)}"`);

  const traces = [];
  try {
    const ragResult = await runRagDoctorQuery(effectivePatientId, normalizedQuery, apiKey, model);
    if (!ragResult.error && ragResult.answer) {
      return res.json({
        response: ragResult.answer,
        answer: ragResult.answer,
        source: ragResult.source,
        rag_hits: ragResult.rag_hits,
        traces,
      });
    }
    if (ragResult.error) {
      return res.json({
        response: ragResult.error,
        error: ragResult.error,
        source: 'rag',
        traces,
      });
    }
    if (!patientId) {
      return res.json({
        response: 'Patient not found. Please select a patient or mention full patient name in query.',
        source: 'rag',
        traces,
      });
    }
    const result = await runAnalysisAgent(normalizedQuery, patientId, apiKey, model, (trace) => traces.push(trace));
    return res.json({ ...result, traces, fallback: 'analysis-agent' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/rag-summary', async (req, res) => {
  const { patientId, apiKey, model } = req.body || {};
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  const buildFallbackSummaryPoints = (patientCase, brief, reason = '') => {
    const diagnoses = [
      ...((patientCase?.primaryDiagnosis || [])),
      ...((patientCase?.secondaryDiagnosis || [])),
    ].filter(Boolean);
    const meds = (patientCase?.medications || []).slice(0, 6);
    const flags = (patientCase?.clinicalFlags || brief?.redFlags || []).slice(0, 4);
    const visits = patientCase?.visits || [];
    const lastVisit = visits.length ? visits[visits.length - 1] : brief?.lastVisitSummary || null;
    const overdue = (patientCase?.overdueTests || brief?.overdueTests || []).slice(0, 3);

    const points = [];
    points.push(
      `${patientCase?.age ?? brief?.age ?? 'Unknown-age'}-year-old ${String(patientCase?.gender || 'patient').toLowerCase()} with ${diagnoses.join(', ') || 'ongoing chronic conditions'}.`
    );
    points.push(
      `Current medications: ${meds.length ? meds.map((m) => `${m.name || m.drug} ${m.dose || ''}`.trim()).join(', ') : 'No active medication list available'}.`
    );
    points.push(
      `Active alerts/issues: ${flags.length ? flags.map((f) => f.flag || f.message || 'clinical flag').join('; ') : 'No major critical flags recorded'}.`
    );
    points.push(
      `Last visit: ${lastVisit?.date || 'date unavailable'}${lastVisit?.clinicalNote ? ` - ${lastVisit.clinicalNote}` : ''}`
    );
    points.push(
      `Symptoms tracked: ${lastVisit?.symptoms?.length ? lastVisit.symptoms.join(', ') : (lastVisit?.chiefComplaint || 'not clearly documented')}.`
    );
    points.push(
      `Recommended next steps: ${overdue.length ? overdue.map((t) => `${t.test || t.name || 'follow-up test'}${t.reason ? ` (${t.reason})` : ''}`).join(', ') : 'continue treatment and monitor trends closely'}.`
    );
    if (reason) {
      points.push(`RAG fallback note: ${reason}.`);
    }
    return points;
  };

  const loadFallbackData = async () => {
    const mongoCase = await getPatientCaseFromMongo(patientId).catch(() => null);
    if (mongoCase) {
      return {
        patientCase: mongoCase,
        brief: buildBriefFromCase(mongoCase, patientId),
      };
    }
    const toolCase = tools.get_patient_case_sheet(patientId);
    if (toolCase && !toolCase.error) {
      return {
        patientCase: toolCase,
        brief: tools.generate_consultation_brief(patientId),
      };
    }
    return { patientCase: null, brief: null };
  };

  try {
    const result = await runRagPatientSummary(patientId, apiKey, model);
    if (result.error) {
      const { patientCase, brief } = await loadFallbackData();
      if (!patientCase && !brief) return res.status(404).json(result);
      return res.json({
        patientId,
        source: 'fallback',
        fallback: true,
        summary_points: buildFallbackSummaryPoints(patientCase, brief, result.error),
        raw: '',
        rag_hits: [],
      });
    }
    if (!Array.isArray(result.summary_points) || result.summary_points.length === 0) {
      const { patientCase, brief } = await loadFallbackData();
      return res.json({
        ...result,
        source: 'fallback',
        fallback: true,
        summary_points: buildFallbackSummaryPoints(patientCase, brief, 'RAG returned empty summary'),
      });
    }
    return res.json(result);
  } catch (e) {
    const { patientCase, brief } = await loadFallbackData();
    if (!patientCase && !brief) return res.status(500).json({ error: e.message });
    return res.json({
      patientId,
      source: 'fallback',
      fallback: true,
      summary_points: buildFallbackSummaryPoints(patientCase, brief, e.message),
      raw: '',
      rag_hits: [],
    });
  }
});

router.post('/agent/rag-query', async (req, res) => {
  const { patientId, query, apiKey, model } = req.body || {};
  if (!patientId || !query) return res.status(400).json({ error: 'patientId and query required' });
  try {
    const result = await runRagDoctorQuery(patientId, query, apiKey, model);
    if (result.error) return res.status(404).json(result);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/second-opinion', async (req, res) => {
  const { patientId, proposedDiagnosis, apiKey, model } = req.body;
  if (!patientId || !proposedDiagnosis) return res.status(400).json({ error: 'patientId and proposedDiagnosis required' });

  blockchain.addBlock('SECOND_OPINION_REQUEST', req.headers['x-actor-id'] || 'UNKNOWN', patientId, `Second opinion: "${proposedDiagnosis}"`);

  try {
    const result = await runSecondOpinionAgent(patientId, proposedDiagnosis, apiKey, model);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/triage', async (req, res) => {
  const { patientId, apiKey } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  blockchain.addBlock('TRIAGE_INITIATED', 'SYSTEM', patientId, 'Triage agent invoked');

  try {
    const result = await runTriageAgent(patientId, apiKey);
    if (result.needs_consultation) {
      blockchain.addBlock('TICKET_RAISED', 'SYSTEM', patientId, `Consultation ticket raised - ${result.priority} priority`);
    }
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/receptionist', async (req, res) => {
  const { message, history, apiKey } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const response = await runReceptionist(message, history || [], apiKey);
    return res.json({ response });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/nutrition', async (req, res) => {
  const { foodDescription, patientId, apiKey } = req.body;

  let conditions = [];
  if (patientId) {
    const patient = isMongoConfigured()
      ? await getPatientCaseFromMongo(patientId)
      : tools.get_patient_case_sheet(patientId);
    if (patient && !patient.error) conditions = [...(patient.primaryDiagnosis || []), ...(patient.secondaryDiagnosis || [])];
  }
  const description =
    foodDescription ||
    (conditions.length
      ? `Give nutrition advice for conditions: ${conditions.join(', ')}`
      : 'Give a balanced diet recommendation for a general adult patient.');

  try {
    const result = await runNutritionAgent(description, conditions, apiKey);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/ocr', uploadAny.any(), async (req, res) => {
  const uploaded = (req.files || []).find((f) => f.fieldname === 'document' || f.fieldname === 'file');
  if (!uploaded) return res.status(400).json({ error: 'No file uploaded' });

  blockchain.addBlock('DOCUMENT_UPLOAD', req.headers['x-actor-id'] || 'PATIENT', req.body.patientId || 'UNKNOWN', `Document uploaded: ${uploaded.originalname}`);

  try {
    const { processUploadedDocument } = require('../agents/ocrAgent');
    const result = await processUploadedDocument(uploaded.path, req.body.apiKey, req.body.model);
    blockchain.addBlock('OCR_PROCESSING', 'SYSTEM', req.body.patientId || 'UNKNOWN', `OCR processing complete - ${result.success ? 'success' : 'failed'}`);

    if (result.success && req.body.patientId && req.body.autoIngest === 'true') {
      const ingestion = await runIngestionAgent(req.body.patientId, result.structured);
      result.ingestion = ingestion;
      blockchain.addBlock('INGESTION_PROCESSING', 'SYSTEM', req.body.patientId, `Ingestion complete - ${ingestion.success ? 'success' : 'failed'}`);
    }

    fs.unlink(uploaded.path, () => {});
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/ingest', async (req, res) => {
  const { patientId, structuredOCRData } = req.body;
  if (!patientId || !structuredOCRData) {
    return res.status(400).json({ error: 'patientId and structuredOCRData required' });
  }

  try {
    const result = await runIngestionAgent(patientId, structuredOCRData);
    blockchain.addBlock('INGESTION_PROCESSING', req.headers['x-actor-id'] || 'SYSTEM', patientId, `Manual ingestion - ${result.success ? 'success' : 'failed'}`);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/intake', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { patientId, query, fromDoctor, toSpecialty, reason, apiKey, model } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  try {
    const { runOrchestratorAgent } = require('../agents/orchestratorAgent');
    const result = await runOrchestratorAgent({
      patientId,
      filePath: req.file.path,
      query,
      fromDoctor,
      toSpecialty,
      reason,
      apiKey,
      model,
    });

    blockchain.addBlock('ORCHESTRATOR_RUN', req.headers['x-actor-id'] || 'SYSTEM', patientId, `Intake pipeline run - ${result.success ? 'success' : 'failed'}`);
    fs.unlink(req.file.path, () => {});
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/agent/transfer', async (req, res) => {
  const { patientId, fromDoctor, toSpecialty, reason, includeAnalysis, analysisQuery, apiKey, model } = req.body;
  if (!patientId || !fromDoctor || !toSpecialty) {
    return res.status(400).json({ error: 'patientId, fromDoctor, toSpecialty required' });
  }

  try {
    const result = await runTransferAgent({
      patientId,
      fromDoctor,
      toSpecialty,
      reason,
      includeAnalysis: includeAnalysis !== false,
      analysisQuery,
      apiKey,
      model,
    });

    blockchain.addBlock('TRANSFER_PACKET_GENERATED', fromDoctor, patientId, `Transfer packet generated for ${toSpecialty}`);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/referral', async (req, res) => {
  const { patientId, fromDoctor, toSpecialty, reason, apiKey, model } = req.body;
  if (!patientId || !fromDoctor || !toSpecialty) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const transfer = await runTransferAgent({
      patientId,
      fromDoctor,
      toSpecialty,
      reason,
      includeAnalysis: true,
      apiKey,
      model,
    });

    blockchain.addBlock('SPECIALIST_REFERRAL', fromDoctor, patientId, `Referred to ${toSpecialty} - ${reason || 'No reason provided'}`);
    return res.json(transfer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/blockchain/chain', (req, res) => res.json(blockchain.getChain()));
router.get('/blockchain/verify', (req, res) => res.json(blockchain.verifyChain()));
router.get('/blockchain/export', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_trail.csv');
  res.send(blockchain.exportCSV());
});

router.post('/emergency', (req, res) => {
  const { patientId, actorId } = req.body;
  blockchain.addBlock('EMERGENCY_ESCALATION', actorId || 'PATIENT', patientId || 'UNKNOWN', 'EMERGENCY button pressed - immediate escalation');
  return res.json({ status: 'EMERGENCY_LOGGED', hospital_phone: '+91 7695 9595 76', ambulance: '108' });
});

module.exports = router;
