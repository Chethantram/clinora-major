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

    const labs = structuredOCRData.lab_results || {};
    if (typeof labs.HbA1c === "number") {
      appendLab(patient, "HbA1c", { date: now.slice(0, 10), value: labs.HbA1c, source: "OCR_INGESTION" });
    }
    if (typeof labs.SerumCreatinine === "number") {
      appendLab(patient, "SerumCreatinine", { date: now.slice(0, 10), value: labs.SerumCreatinine, source: "OCR_INGESTION" });
    }
    if (typeof labs.eGFR === "number") {
      appendLab(patient, "eGFR", { date: now.slice(0, 10), value: labs.eGFR, source: "OCR_INGESTION" });
    }
    if (typeof labs.Haemoglobin === "number") {
      appendLab(patient, "Haemoglobin", { date: now.slice(0, 10), value: labs.Haemoglobin, source: "OCR_INGESTION" });
    }
    if (labs.BloodPressure && typeof labs.BloodPressure.systolic === "number" && typeof labs.BloodPressure.diastolic === "number") {
      appendLab(patient, "BloodPressure", {
        date: now.slice(0, 10),
        systolic: labs.BloodPressure.systolic,
        diastolic: labs.BloodPressure.diastolic,
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

  const tests = uniqStrings(toArray(structuredOCRData.tests_recommended));
  const symptoms = uniqStrings(toArray(structuredOCRData.symptoms));
  const labs = structuredOCRData.lab_results || {};
  const labRows = ["HbA1c", "SerumCreatinine", "eGFR", "Haemoglobin"]
    .filter((test) => typeof labs[test] === "number")
    .map((test) => ({ patient_id: normalizedId, test, value: labs[test], date: now.slice(0, 10), source: "OCR_INGESTION" }));
  if (labs.BloodPressure?.systolic != null && labs.BloodPressure?.diastolic != null) {
    labRows.push({
      patient_id: normalizedId,
      test: "BloodPressure",
      systolic: labs.BloodPressure.systolic,
      diastolic: labs.BloodPressure.diastolic,
      date: now.slice(0, 10),
      source: "OCR_INGESTION",
    });
  }
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
