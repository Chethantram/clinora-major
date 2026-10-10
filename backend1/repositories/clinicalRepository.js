const { getMongoDb } = require('../db/mongo');

function normalizePatientId(value) {
  return String(value || '').trim().toUpperCase();
}

function patientFilter(patientId) {
  const normalized = normalizePatientId(patientId);
  return { $or: [{ patient_id: normalized }, { id: normalized }] };
}

function patientIdFilter(patientId) {
  return { patient_id: normalizePatientId(patientId) };
}

function normalizePatient(patient) {
  if (!patient) return null;
  const diagnosis = Array.isArray(patient.diagnosis)
    ? patient.diagnosis
    : [...(patient.primaryDiagnosis || []), ...(patient.secondaryDiagnosis || [])];
  return {
    _id: patient._id || null,
    patient_id: patient.patient_id || patient.id,
    name: patient.name || 'Unknown',
    age: patient.age ?? null,
    gender: patient.gender || 'Unknown',
    email: patient.email || null,
    phone: patient.phone || null,
    blood_group: patient.blood_group || patient.bloodGroup || null,
    diagnosis,
    allergies: patient.allergies || [],
    status: patient.status || null,
    lastVisit: patient.lastVisit || null,
    overdueTests: patient.overdueTests || [],
    address: patient.address || null,
    emergencyContact: patient.emergencyContact || null,
  };
}

function normalizeVisit(visit) {
  return {
    visit_id: visit.visit_id || null,
    patient_id: visit.patient_id,
    date: visit.date || null,
    doctor: visit.doctor || '',
    department: visit.department || '',
    visit_type: visit.visit_type || visit.visitType || '',
    doctor_notes: visit.doctor_notes || visit.clinicalNote || visit.plan || '',
    symptoms: Array.isArray(visit.symptoms)
      ? visit.symptoms
      : visit.chiefComplaint
      ? String(visit.chiefComplaint).split(',').map((value) => value.trim()).filter(Boolean)
      : [],
    bp_systolic: visit.bp_systolic ?? visit.bp?.systolic ?? null,
    bp_diastolic: visit.bp_diastolic ?? visit.bp?.diastolic ?? null,
    pulse_bpm: visit.pulse_bpm ?? visit.pulse ?? null,
    temperature_c: visit.temperature_c ?? visit.temperature ?? null,
    spo2_pct: visit.spo2_pct ?? visit.spo2 ?? null,
    weight_kg: visit.weight_kg ?? visit.weight ?? null,
  };
}

function normalizeMedication(medication) {
  return {
    med_id: medication.med_id || null,
    patient_id: medication.patient_id,
    drug: medication.drug || medication.name || '',
    dose: medication.dose || medication.dosage || '',
    frequency: medication.frequency || '',
    route: medication.route || '',
    start_date: medication.start_date || medication.since || null,
    end_date: medication.end_date || null,
    prescribed_by: medication.prescribed_by || null,
    active: medication.active ?? true,
  };
}

function normalizePrescription(prescription) {
  return {
    ...normalizeMedication(prescription),
    med_id: String(prescription.med_id || prescription._id || ''),
    patient_id: normalizePatientId(prescription.patient_id),
    start_date: prescription.start_date || prescription.startDate || null,
    prescribed_by: prescription.prescribed_by || prescription.prescribedBy || null,
    record_type: 'prescription',
    created_at: prescription.created_at || prescription.createdAt || null,
  };
}

function normalizeDrugInteraction(interaction) {
  const severity = String(interaction.severity || 'low').trim().toLowerCase();
  return {
    drug_a: interaction.drug_a || interaction.drug1 || '',
    drug_b: interaction.drug_b || interaction.drug2 || '',
    severity: ['critical', 'high', 'urgent', 'severe'].includes(severity)
      ? 'High'
      : ['medium', 'moderate'].includes(severity)
      ? 'Moderate'
      : 'Low',
    risk: interaction.risk || interaction.effect || '',
    action: interaction.action || '',
  };
}

function parseNormalRange(value) {
  if (value && typeof value === 'object') {
    const min = value.min == null ? Number.NaN : Number(value.min);
    const max = value.max == null ? Number.NaN : Number(value.max);
    return {
      ...(Number.isFinite(min) ? { min } : {}),
      ...(Number.isFinite(max) ? { max } : {}),
    };
  }

  const range = String(value || '').trim();
  const bounded = range.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);
  if (bounded) return { min: Number(bounded[1]), max: Number(bounded[2]) };

  const upperBound = range.match(/^<\s*(-?\d+(?:\.\d+)?)$/);
  if (upperBound) return { max: Number(upperBound[1]) };

  const lowerBound = range.match(/^>\s*(-?\d+(?:\.\d+)?)$/);
  if (lowerBound) return { min: Number(lowerBound[1]) };

  return {};
}

function normalizeLab(lab) {
  const normalRange = lab.normalRange ?? lab.normal_range ?? lab.referenceRange ?? '';
  return {
    lab_id: lab.lab_id || null,
    patient_id: lab.patient_id,
    test: lab.test || lab.test_name || '',
    value: lab.value ?? null,
    unit: lab.unit || '',
    date: lab.date || null,
    status: lab.status || 'unknown',
    normal_range: typeof normalRange === 'string' ? normalRange : '',
    normalRange: parseNormalRange(normalRange),
    lab_name: lab.lab_name || lab.labName || '',
  };
}

function normalizeAlert(alert) {
  return {
    id: String(alert.alert_id || alert._id || alert.id || `${alert.patient_id}-${alert.date || alert.timestamp || ''}`),
    patient_id: alert.patient_id,
    type: alert.type || 'alert',
    severity: alert.severity || 'low',
    message: alert.message || alert.title || alert.type || 'Clinical alert',
    timestamp: alert.timestamp || alert.date || null,
    evidence: alert.evidence || '',
    recommendation: alert.recommendation || '',
  };
}

function buildAlerts(rawAlerts, rawLabs) {
  const storedAlerts = rawAlerts.map(normalizeAlert);
  if (storedAlerts.length) return storedAlerts;

  return rawLabs
    .map(normalizeLab)
    .filter((lab) => /critical|high|abnormal|borderline|low/i.test(lab.status))
    .map((lab) => ({
      id: `${lab.patient_id}-${lab.test}-${lab.date}`,
      patient_id: lab.patient_id,
      type: 'lab',
      severity: /critical|high/i.test(lab.status) ? 'high' : 'medium',
      message: `${lab.test}: ${lab.status}${lab.value == null ? '' : ` (${lab.value}${lab.unit})`}`,
      timestamp: lab.date,
      evidence: '',
      recommendation: '',
    }));
}

async function listPatients() {
  const db = await getMongoDb();
  const [patients, visits, alerts] = await Promise.all([
    db.collection('patients').find({}).toArray(),
    db.collection('visits').find({}, { projection: { patient_id: 1, date: 1 } }).toArray(),
    db.collection('alerts').find({}, { projection: { patient_id: 1, severity: 1 } }).toArray(),
  ]);
  const lastVisitByPatient = visits.reduce((result, visit) => {
    if (!visit.patient_id) return result;
    if (!result[visit.patient_id] || new Date(visit.date || 0) > new Date(result[visit.patient_id])) {
      result[visit.patient_id] = visit.date;
    }
    return result;
  }, {});
  const severityByPatient = alerts.reduce((result, alert) => {
    const current = result[alert.patient_id] || 'low';
    if (alert.severity === 'high' || (alert.severity === 'critical')) result[alert.patient_id] = 'high';
    else if (alert.severity === 'medium' && current === 'low') result[alert.patient_id] = 'medium';
    return result;
  }, {});
  return patients.map((patient) => {
    const normalized = normalizePatient(patient);
    const severity = severityByPatient[normalized.patient_id];
    return {
      ...normalized,
      status: normalized.status || (severity === 'high' ? 'critical' : severity === 'medium' ? 'monitoring' : 'stable'),
      lastVisit: normalized.lastVisit || lastVisitByPatient[normalized.patient_id] || null,
    };
  });
}

async function createPatient(input) {
  const db = await getMongoDb();
  const patients = db.collection('patients');
  await patients.createIndex({ patient_id: 1 }, { unique: true });
  const existingPatients = await patients
    .find({ patient_id: /^P\d+$/ }, { projection: { patient_id: 1 } })
    .toArray();
  const highestExistingId = existingPatients.reduce((highest, patient) => {
    const sequence = Number(String(patient.patient_id).slice(1));
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  const counters = db.collection('counters');

  try {
    await counters.updateOne(
      { _id: 'patient_id' },
      { $max: { sequence: highestExistingId } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await counters.findOneAndUpdate(
      { _id: 'patient_id' },
      { $inc: { sequence: 1 } },
      { returnDocument: 'after' }
    );
    const sequence = result.value?.sequence;
    if (!Number.isSafeInteger(sequence)) throw new Error('Could not allocate a patient ID');

    const patientId = `P${String(sequence).padStart(3, '0')}`;
    const patient = {
      patient_id: patientId,
      name: input.name,
      age: input.age,
      gender: input.gender,
      email: input.email,
      phone: input.phone,
      blood_group: input.blood_group,
      diagnosis: input.diagnosis,
      allergies: input.allergies,
      status: 'stable',
      lastVisit: null,
      createdAt: new Date(),
    };

    try {
      await patients.insertOne(patient);
      return normalizePatient(patient);
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  throw new Error('Could not allocate a unique patient ID');
}

async function getPatientBundle(patientId) {
  const db = await getMongoDb();
  const filter = patientFilter(patientId);
  const normalizedId = normalizePatientId(patientId);
  const [patient, visits, medications, labs, alerts] = await Promise.all([
    db.collection('patients').findOne(filter),
    db.collection('visits').find(patientIdFilter(normalizedId)).sort({ date: 1 }).toArray(),
    db.collection('medications').find(patientIdFilter(normalizedId)).toArray(),
    db.collection('labs').find(patientIdFilter(normalizedId)).sort({ date: 1 }).toArray(),
    db.collection('alerts').find(patientIdFilter(normalizedId)).sort({ timestamp: -1, date: -1 }).toArray(),
  ]);
  if (!patient) return null;
  return {
    patient: normalizePatient(patient),
    visits: visits.map(normalizeVisit),
    medications: medications.map(normalizeMedication),
    labs: labs.map(normalizeLab),
    alerts: alerts.map(normalizeAlert),
  };
}

async function getAllPatientBundles() {
  const patients = await listPatients();
  const bundles = await Promise.all(patients.map((patient) => getPatientBundle(patient.patient_id)));
  return bundles.filter(Boolean);
}

async function getMedicationOverview() {
  const db = await getMongoDb();
  const [rawPatients, rawMedications, rawPrescriptions, rawInteractions] = await Promise.all([
    db.collection('patients').find({}).toArray(),
    db.collection('medications').find({}).toArray(),
    db.collection('prescriptions').find({}).sort({ created_at: -1 }).toArray(),
    db.collection('drug_interactions').find({}).toArray(),
  ]);

  return {
    patients: rawPatients.map(normalizePatient),
    medications: [
      ...rawMedications.map((medication) => ({
        ...normalizeMedication(medication),
        med_id: String(medication.med_id || medication._id || ''),
        record_type: 'medication',
      })),
      ...rawPrescriptions.map(normalizePrescription),
    ].sort((first, second) => new Date(second.start_date || 0) - new Date(first.start_date || 0)),
    drugInteractions: rawInteractions.map(normalizeDrugInteraction),
  };
}

async function createPrescription(input) {
  const db = await getMongoDb();
  const prescription = {
    med_id: `MED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patient_id: normalizePatientId(input.patient_id),
    drug: input.drug.trim(),
    dose: input.dose.trim(),
    frequency: input.frequency.trim(),
    start_date: input.start_date || new Date().toISOString().slice(0, 10),
    prescribed_by: input.prescribed_by || null,
    active: true,
    created_at: new Date().toISOString(),
  };
  await db.collection('prescriptions').insertOne(prescription);
  return normalizePrescription(prescription);
}

async function updateMedication(medicationId, input, recordType = 'prescription') {
  const db = await getMongoDb();
  const collection = db.collection(recordType === 'medication' ? 'medications' : 'prescriptions');
  const updates = {
    patient_id: normalizePatientId(input.patient_id),
    drug: input.drug.trim(),
    dose: input.dose.trim(),
    frequency: input.frequency.trim(),
    start_date: input.start_date || null,
    prescribed_by: input.prescribed_by || null,
    updated_at: new Date().toISOString(),
  };
  const result = await collection.updateOne({ med_id: medicationId }, { $set: updates });
  if (result.matchedCount === 0) return null;
  const updated = await collection.findOne({ med_id: medicationId });
  return recordType === 'medication'
    ? { ...normalizeMedication(updated), med_id: String(updated.med_id), record_type: 'medication' }
    : normalizePrescription(updated);
}

async function getLabResults() {
  const db = await getMongoDb();
  const [rawLabs, rawPatients] = await Promise.all([
    db.collection('labs').find({}).sort({ date: -1 }).toArray(),
    db.collection('patients').find({}, { projection: { patient_id: 1, id: 1, name: 1 } }).toArray(),
  ]);
  const patientNames = new Map(rawPatients.map((patient) => [
    normalizePatientId(patient.patient_id || patient.id),
    patient.name || 'Unknown patient',
  ]));

  return rawLabs
    .map((lab) => {
      const normalized = normalizeLab(lab);
      return {
        ...normalized,
        id: String(lab.lab_id || lab._id || `${normalized.patient_id}-${normalized.test}-${normalized.date || ''}`),
        patient_name: patientNames.get(normalizePatientId(normalized.patient_id)) || 'Unknown patient',
      };
    })
    .filter((lab) => lab.patient_id && lab.test);
}

async function getAlerts() {
  const db = await getMongoDb();
  const [rawAlerts, rawLabs, rawPatients] = await Promise.all([
    db.collection('alerts').find({}).toArray(),
    db.collection('labs').find({}).toArray(),
    db.collection('patients').find({}, { projection: { patient_id: 1, id: 1, name: 1 } }).toArray(),
  ]);
  const patientNames = new Map(rawPatients.map((patient) => [
    normalizePatientId(patient.patient_id || patient.id),
    patient.name || 'Unknown patient',
  ]));

  return buildAlerts(rawAlerts, rawLabs)
    .map((alert) => ({
      ...alert,
      patient_name: patientNames.get(normalizePatientId(alert.patient_id)) || 'Unknown patient',
    }))
    .sort((first, second) => new Date(second.timestamp || 0) - new Date(first.timestamp || 0));
}

async function getDashboardData() {
  const db = await getMongoDb();
  const [rawPatients, rawVisits, rawMedications, rawLabs, rawAlerts, drugInteractions] = await Promise.all([
    db.collection('patients').find({}).toArray(),
    db.collection('visits').find({}).toArray(),
    db.collection('medications').find({}).toArray(),
    db.collection('labs').find({}).toArray(),
    db.collection('alerts').find({}).toArray(),
    db.collection('drug_interactions').find({}).toArray(),
  ]);

  const visits = rawVisits.map(normalizeVisit);
  const medications = rawMedications.map(normalizeMedication);
  const labs = rawLabs.map(normalizeLab);
  const alerts = buildAlerts(rawAlerts, rawLabs);

  const lastVisitByPatient = new Map();
  for (const visit of visits) {
    if (!visit.patient_id || !visit.date) continue;
    const current = lastVisitByPatient.get(visit.patient_id);
    if (!current || new Date(visit.date) > new Date(current)) {
      lastVisitByPatient.set(visit.patient_id, visit.date);
    }
  }

  const severityByPatient = new Map();
  for (const alert of alerts) {
    const current = severityByPatient.get(alert.patient_id) || 'low';
    const severity = String(alert.severity).toLowerCase();
    if (severity === 'critical' || severity === 'high') severityByPatient.set(alert.patient_id, 'high');
    else if (severity === 'medium' && current === 'low') severityByPatient.set(alert.patient_id, 'medium');
  }

  const patients = rawPatients.map((record) => {
    const patient = normalizePatient(record);
    const severity = severityByPatient.get(patient.patient_id);
    return {
      ...patient,
      status: patient.status || (severity === 'high' ? 'critical' : severity === 'medium' ? 'monitoring' : 'stable'),
      lastVisit: patient.lastVisit || lastVisitByPatient.get(patient.patient_id) || null,
    };
  });

  return {
    patients,
    visits,
    medications,
    labResults: labs,
    alerts,
    drugInteractions: drugInteractions.map((interaction) => ({
      drug_a: interaction.drug_a || interaction.drug1,
      drug_b: interaction.drug_b || interaction.drug2,
      severity: interaction.severity || 'Low',
      risk: interaction.risk || interaction.effect || '',
    })),
  };
}

async function getReportData() {
  const [dashboard, rawPrescriptions] = await Promise.all([
    getDashboardData(),
    (async () => {
      const db = await getMongoDb();
      return db.collection('prescriptions').find({}).sort({ created_at: -1 }).toArray();
    })(),
  ]);

  return {
    ...dashboard,
    medications: [
      ...dashboard.medications.map((medication) => ({ ...medication, record_type: 'medication' })),
      ...rawPrescriptions.map(normalizePrescription),
    ],
  };
}

async function getReferenceData(collectionName) {
  const db = await getMongoDb();
  return db.collection(collectionName).find({}).toArray();
}

module.exports = {
  getAllPatientBundles,
  getAlerts,
  getMedicationOverview,
  createPrescription,
  updateMedication,
  getLabResults,
  createPatient,
  getDashboardData,
  getReportData,
  getPatientBundle,
  getReferenceData,
  listPatients,
  normalizeLab,
  normalizeMedication,
  normalizePatient,
  normalizeVisit,
};