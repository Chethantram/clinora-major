require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { getMongoDb, getMongoUri, closeMongo } = require('../db/mongo');

const DATA_DIR = path.join(__dirname, '../data');
const DB_NAME = process.env.MONGO_DB_NAME || 'clinsight';

function readJson(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback;
}

function patientFiles() {
  return fs.readdirSync(DATA_DIR)
    .filter((fileName) => /^patient_.*\.json$/i.test(fileName))
    .map((fileName) => readJson(fileName, null))
    .filter(Boolean);
}

function normalizedPatients(records) {
  return records.map((patient) => ({
    patient_id: patient.id || patient.patient_id,
    name: patient.name || 'Unknown',
    age: patient.age ?? null,
    gender: patient.gender || 'Unknown',
    blood_group: patient.blood_group || patient.bloodGroup || null,
    phone: patient.phone || null,
    address: patient.address || null,
    emergencyContact: patient.emergencyContact || null,
    email: patient.email || null,
    diagnosis: [...(patient.primaryDiagnosis || []), ...(patient.secondaryDiagnosis || [])],
    allergies: patient.allergies || [],
    overdueTests: patient.overdueTests || [],
    status: null,
    lastVisit: patient.visits?.length ? patient.visits[patient.visits.length - 1].date : null,
    createdAt: new Date().toISOString(),
  }));
}

function normalizedVisits(records) {
  return records.flatMap((patient) => (patient.visits || []).map((visit, index) => ({
    visit_id: `${patient.id}-V${String(index + 1).padStart(3, '0')}`,
    patient_id: patient.id,
    date: visit.date || null,
    doctor: visit.doctor || '',
    department: visit.department || '',
    visit_type: visit.visitType || '',
    doctor_notes: visit.clinicalNote || visit.plan || '',
    symptoms: visit.chiefComplaint ? String(visit.chiefComplaint).split(',').map((value) => value.trim()).filter(Boolean) : [],
    plan: visit.plan || '',
    source: visit.source || 'SEED',
  })));
}

function normalizedMedications(records) {
  return records.flatMap((patient) => (patient.medications || []).map((medication, index) => ({
    med_id: `${patient.id}-M${String(index + 1).padStart(3, '0')}`,
    patient_id: patient.id,
    drug: medication.name || medication.drug || '',
    dose: medication.dose || '',
    frequency: medication.frequency || '',
    route: medication.route || '',
    start_date: medication.since || medication.start_date || null,
    end_date: medication.end_date || null,
    prescribed_by: medication.prescribed_by || null,
    active: medication.active ?? true,
  })));
}

function normalizedLabs(records) {
  return records.flatMap((patient) => Object.entries(patient.labResults || {}).flatMap(([test, rows]) =>
    (rows || []).map((row, index) => ({
      lab_id: `${patient.id}-L-${test}-${index + 1}`,
      patient_id: patient.id,
      test,
      value: row.value ?? null,
      systolic: row.systolic ?? null,
      diastolic: row.diastolic ?? null,
      unit: row.unit || '',
      date: row.date || null,
      status: row.status || 'unknown',
      normal_range: row.referenceRange || row.normal_range || '',
      source: row.source || 'SEED',
    }))
  ));
}

function normalizedAlerts(records) {
  return records.flatMap((patient) => (patient.clinicalFlags || []).map((flag, index) => ({
    alert_id: `${patient.id}-A${String(index + 1).padStart(3, '0')}`,
    patient_id: patient.id,
    type: flag.type || 'LOW',
    severity: String(flag.type || 'low').toLowerCase(),
    message: flag.flag || '',
    evidence: flag.evidence || '',
    recommendation: flag.recommendation || '',
    timestamp: flag.date || null,
  })));
}

async function upsertCollection(db, name, documents, key) {
  if (!documents.length) return;
  await db.collection(name).bulkWrite(
    documents.map((document) => ({
      updateOne: {
        filter: { [key]: document[key] },
        update: { $set: document },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  console.log(`${name}: ${documents.length} records upserted`);
}

async function seed() {
  const mongoUri = getMongoUri();
  if (!mongoUri || !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('Set MONGODB_URI to a mongodb+srv:// Atlas connection string in backend1/.env before seeding');
  }
  if (mongoUri.includes('<username>') || mongoUri.includes('<password>') || mongoUri.includes('<cluster>')) {
    throw new Error('Replace <username>, <password>, and <cluster> in backend1/.env with your Atlas connection details before seeding');
  }
  const db = await getMongoDb();
  const records = patientFiles();
  const users = readJson('users.json', { doctors: [], patients: [] });
  const interactions = readJson('drug_interactions.json', []);
  const guidelines = readJson('clinical_guidelines.json', {});

  await upsertCollection(db, 'patients', normalizedPatients(records), 'patient_id');
  await upsertCollection(db, 'visits', normalizedVisits(records), 'visit_id');
  await upsertCollection(db, 'medications', normalizedMedications(records), 'med_id');
  await upsertCollection(db, 'labs', normalizedLabs(records), 'lab_id');
  await upsertCollection(db, 'alerts', normalizedAlerts(records), 'alert_id');
  await upsertCollection(db, 'users', [{ ...users, _id: 'application-users' }], '_id');
  await upsertCollection(db, 'drug_interactions', interactions.map((item, index) => ({
    interaction_id: item.id || `interaction-${index + 1}`,
    ...item,
  })), 'interaction_id');
  await upsertCollection(db, 'clinical_guidelines', [{ _id: 'clinical-guidelines', ...guidelines }], '_id');

  await Promise.all([
    db.collection('patients').createIndex({ patient_id: 1 }, { unique: true }),
    db.collection('visits').createIndex({ patient_id: 1, date: -1 }),
    db.collection('medications').createIndex({ patient_id: 1, active: 1 }),
    db.collection('labs').createIndex({ patient_id: 1, test: 1, date: -1 }),
    db.collection('alerts').createIndex({ patient_id: 1, timestamp: -1 }),
  ]);
  console.log(`Atlas seed completed in database ${DB_NAME}`);
}

seed()
  .catch((error) => {
    console.error(`Atlas seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
