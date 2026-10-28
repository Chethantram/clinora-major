require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { indexPatient } = require("../rag/vectorStore");
const { getMongoDb, isMongoConfigured } = require("../db/mongo");
const { getPatientBundle } = require("../repositories/clinicalRepository");

const DATA_DIR = path.join(__dirname, "../data");

function patientFile(patientId) {
  return path.join(DATA_DIR, `patient_${patientId}.json`);
}

function loadPatient(patientId) {
  const file = patientFile(patientId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function savePatient(patientId, data) {
  fs.writeFileSync(patientFile(patientId), JSON.stringify(data, null, 2));
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqStrings(values) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function appendLab(patient, testName, entry) {
  if (!patient.labResults[testName]) patient.labResults[testName] = [];
  patient.labResults[testName].push(entry);
}

function normalizeLabRows(structuredOCRData) {
  const rows = Array.isArray(structuredOCRData.lab_results_rows)
    ? structuredOCRData.lab_results_rows
    : Object.entries(structuredOCRData.lab_results || {}).flatMap(([test, value]) => {
      if (test === "BloodPressure" && value && typeof value === "object") {
        return [{ test, systolic: value.systolic, diastolic: value.diastolic }];
      }
      return [{ test, value }];
    });
  return rows
    .map((row) => ({
      test: String(row?.test || "").trim().slice(0, 120),
      value: row?.value == null ? null : Number(row.value),
      unit: String(row?.unit || "").trim().slice(0, 40),
      normal_range: String(row?.reference_range || row?.normal_range || "").trim().slice(0, 80),
      status: String(row?.status || "recorded").trim().slice(0, 40),
      date: String(row?.date || "").trim() || null,
      systolic: row?.systolic == null ? null : Number(row.systolic),
      diastolic: row?.diastolic == null ? null : Number(row.diastolic),
    }))
    .filter((row) => row.test && (
      Number.isFinite(row.value) || (row.test.toLowerCase() === "bloodpressure" && Number.isFinite(row.systolic) && Number.isFinite(row.diastolic))
    ));
}

function normalizeRecord(patientId, existing) {
  return existing || {
    id: String(patientId),
    name: "Unknown",
    age: null,
    gender: null,
    bloodGroup: null,
    primaryDiagnosis: [],
    secondaryDiagnosis: [],
    allergies: [],
    medications: [],
    labResults: {},
    visits: [],
    clinicalFlags: [],
    overdueTests: [],
  };
}

async function runIngestionAgent(patientId, structuredOCRData) {
  try {
    if (!patientId || !structuredOCRData) {
      return { success: false, error: "patientId and structuredOCRData are required" };
    }

    if (isMongoConfigured()) {
      return ingestToMongo(patientId, structuredOCRData);
    }

    const patient = normalizeRecord(patientId, loadPatient(patientId));
    const now = new Date().toISOString();

    if (structuredOCRData.patient_name) {
      patient.name = structuredOCRData.patient_name;
    }

    patient.primaryDiagnosis = uniqStrings([
      ...toArray(patient.primaryDiagnosis),
      ...toArray(structuredOCRData.diagnosis),
    ]);

    patient.allergies = uniqStrings([
      ...toArray(patient.allergies),
      ...toArray(structuredOCRData.allergies),
    ]);

    const oldMeds = toArray(patient.medications).map((m) => (typeof m === "string" ? m : m.name));
    const newMeds = toArray(structuredOCRData.medications);
    patient.medications = uniqStrings([...oldMeds, ...newMeds]).map((name) => ({ name }));

    const tests = toArray(structuredOCRData.tests_recommended);
    const existingTests = toArray(patient.overdueTests).map((t) => (typeof t === "string" ? t : t.test));
    patient.overdueTests = uniqStrings([...existingTests, ...tests]).map((test) => ({ test }));

    const symptoms = toArray(structuredOCRData.symptoms);
    for (const symptom of symptoms) {
      patient.clinicalFlags.push({
        type: "HIGH",
        flag: `Reported symptom: ${symptom}`,
        evidence: "Imported from OCR document",
        recommendation: "Physician review advised",
      });
    }

    const labRows = normalizeLabRows(structuredOCRData);
    for (const row of labRows) {
      appendLab(patient, row.test, {
        ...row,
        date: row.date || now.slice(0, 10),
        source: "OCR_INGESTION",
      });
    }

    patient.visits.push({
      date: now.slice(0, 10),
      doctor: "OCR Import",
      department: "Medical Records",
      chiefComplaint: symptoms.join(", ") || "Document ingestion",
      clinicalNote: structuredOCRData.clinical_summary || "",
      plan: tests.join(", "),
      source: "OCR_INGESTION",
    });

    savePatient(patientId, patient);
    await indexPatient(patient);

    return {
      success: true,
      patient_id: String(patientId),
      message: "Patient data ingested successfully",
      medications_count: patient.medications.length,
      visits_count: patient.visits.length,
      diagnoses_count: patient.primaryDiagnosis.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Ingestion agent failed",
      message: error.message,
    };
  }
}

async function ingestToMongo(patientId, structuredOCRData) {
  const db = await getMongoDb();
  const normalizedId = String(patientId).trim().toUpperCase();
  const bundle = await getPatientBundle(normalizedId);
  if (!bundle) return { success: false, error: `Patient ${normalizedId} not found` };

  const now = new Date().toISOString();
  const diagnosis = uniqStrings([...bundle.patient.diagnosis, ...toArray(structuredOCRData.diagnosis)]);
  const allergies = uniqStrings([...bundle.patient.allergies, ...toArray(structuredOCRData.allergies)]);
  const update = {
    diagnosis,
    allergies,
    ...(structuredOCRData.patient_name ? { name: structuredOCRData.patient_name } : {}),
    updatedAt: now,
  };
  await db.collection("patients").updateOne({ patient_id: normalizedId }, { $set: update });

  const medications = uniqStrings([
    ...bundle.medications.map((medication) => medication.drug),
    ...toArray(structuredOCRData.medications),
  ]);
  if (medications.length) {
    await db.collection("medications").bulkWrite(
      medications.map((drug) => ({
        updateOne: {
          filter: { patient_id: normalizedId, drug },
          update: { $setOnInsert: { patient_id: normalizedId, drug, active: true, source: "OCR_INGESTION" } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const tests = uniqStrings(toArray(structuredOCRData.tests_recommended));
  const symptoms = uniqStrings(toArray(structuredOCRData.symptoms));
  const labRows = normalizeLabRows(structuredOCRData).map((row) => ({
    ...row,
    patient_id: normalizedId,
    date: row.date || now.slice(0, 10),
    source: "OCR_INGESTION",
  }));
  if (labRows.length) await db.collection("labs").insertMany(labRows);
  if (symptoms.length) {
    await db.collection("alerts").insertMany(symptoms.map((symptom, index) => ({
      alert_id: `${normalizedId}-OCR-${Date.now()}-${index}`,
      patient_id: normalizedId,
      type: "HIGH",
      severity: "high",
      message: `Reported symptom: ${symptom}`,
      evidence: "Imported from OCR document",
      recommendation: "Physician review advised",
      timestamp: now,
    })));
  }
  await db.collection("visits").insertOne({
    visit_id: `${normalizedId}-OCR-${Date.now()}`,
    patient_id: normalizedId,
    date: now.slice(0, 10),
    doctor: "OCR Import",
    department: "Medical Records",
    symptoms,
    doctor_notes: structuredOCRData.clinical_summary || "",
    plan: tests.join(", "),
    source: "OCR_INGESTION",
  });

  const refreshed = await getPatientBundle(normalizedId);
  await indexPatient({
    id: normalizedId,
    ...refreshed.patient,
    primaryDiagnosis: diagnosis,
    secondaryDiagnosis: [],
    medications: refreshed.medications.map((medication) => ({ name: medication.drug, dose: medication.dose, frequency: medication.frequency })),
    visits: refreshed.visits,
    labResults: refreshed.labs.reduce((result, lab) => {
      if (!result[lab.test]) result[lab.test] = [];
      result[lab.test].push(lab);
      return result;
    }, {}),
    clinicalFlags: refreshed.alerts,
    overdueTests: tests.map((test) => ({ test })),
  });
  return { success: true, patient_id: normalizedId, message: "Patient data ingested successfully", medications_count: medications.length, visits_count: refreshed.visits.length, diagnoses_count: diagnosis.length };
}

module.exports = { runIngestionAgent };
