// seed.js — Run this from inside the backend1/ folder
// Command: node seed.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinsight';
const DB_NAME   = process.env.MONGO_DB_NAME || 'clinsight';

// ─── ALL PATIENT DATA ──────────────────────────────────────────────────────────

const patients = [
  {
    "id": "P001",
    "name": "Rajan Subramaniam",
    "age": 58,
    "gender": "Male",
    "bloodGroup": "B+",
    "phone": "+91 98400 12345",
    "address": "14/2, Kelambakkam Main Road, Melakottaiyur, Chennai - 600127",
    "emergencyContact": "Lakshmi Subramaniam (Wife) — +91 98400 67890",
    "registeredAt": "Kathir Memorial Hospital",
    "primaryDiagnosis": ["Type 2 Diabetes Mellitus (E11)", "Hypertension (I10)"],
    "secondaryDiagnosis": ["Early Diabetic Nephropathy (N08)"],
    "allergies": ["Amoxicillin — rash (2019), Beta-lactam caution documented"],
    "medications": [
      { "name": "Metformin", "dose": "1000mg", "frequency": "Twice daily with meals", "since": "2024-02-10", "indication": "Type 2 Diabetes — reduces hepatic glucose production", "caution": "Stop 48h before contrast imaging procedures", "reminder": ["08:00", "20:00"] },
      { "name": "Amlodipine", "dose": "5mg", "frequency": "Once daily morning", "since": "2025-06-15", "indication": "Hypertension — calcium channel blocker", "caution": "Interaction with Simvastatin — limit statin to 20mg", "reminder": ["08:00"] },
      { "name": "Simvastatin", "dose": "20mg", "frequency": "Once daily at night", "since": "2024-02-10", "indication": "Hypercholesterolaemia — lipid lowering", "caution": "Myopathy risk when combined with Amlodipine", "reminder": ["22:00"] }
    ],
    "labResults": {
      "HbA1c": [
        { "date": "2025-02-10", "value": 7.2, "unit": "%", "referenceRange": "<7.0", "status": "borderline" },
        { "date": "2025-04-15", "value": 7.8, "unit": "%", "referenceRange": "<7.0", "status": "high" },
        { "date": "2025-06-20", "value": 8.1, "unit": "%", "referenceRange": "<7.0", "status": "high" },
        { "date": "2025-08-18", "value": 8.6, "unit": "%", "referenceRange": "<7.0", "status": "high" },
        { "date": "2025-10-10", "value": 9.0, "unit": "%", "referenceRange": "<7.0", "status": "critical" },
        { "date": "2025-12-05", "value": 9.2, "unit": "%", "referenceRange": "<7.0", "status": "critical" },
        { "date": "2026-02-08", "value": 9.4, "unit": "%", "referenceRange": "<7.0", "status": "critical" }
      ],
      "SerumCreatinine": [
        { "date": "2025-03-12", "value": 1.1, "unit": "mg/dL", "referenceRange": "0.7-1.2", "status": "normal" },
        { "date": "2025-06-20", "value": 1.3, "unit": "mg/dL", "referenceRange": "0.7-1.2", "status": "borderline" },
        { "date": "2025-09-15", "value": 1.6, "unit": "mg/dL", "referenceRange": "0.7-1.2", "status": "high" },
        { "date": "2025-12-05", "value": 1.9, "unit": "mg/dL", "referenceRange": "0.7-1.2", "status": "high" },
        { "date": "2026-02-08", "value": 2.1, "unit": "mg/dL", "referenceRange": "0.7-1.2", "status": "critical" }
      ],
      "eGFR": [
        { "date": "2025-06-20", "value": 72, "unit": "mL/min", "referenceRange": ">60", "status": "normal" },
        { "date": "2025-12-05", "value": 58, "unit": "mL/min", "referenceRange": ">60", "status": "borderline" },
        { "date": "2026-02-08", "value": 51, "unit": "mL/min", "referenceRange": ">60", "status": "critical" }
      ],
      "BloodPressure": [
        { "date": "2025-02-10", "systolic": 142, "diastolic": 88, "status": "high" },
        { "date": "2025-03-15", "systolic": 138, "diastolic": 86, "status": "high" },
        { "date": "2025-04-18", "systolic": 145, "diastolic": 90, "status": "high" },
        { "date": "2025-05-20", "systolic": 148, "diastolic": 92, "status": "high" },
        { "date": "2025-06-22", "systolic": 150, "diastolic": 94, "status": "high" },
        { "date": "2025-08-18", "systolic": 146, "diastolic": 90, "status": "high" },
        { "date": "2025-10-10", "systolic": 152, "diastolic": 96, "status": "critical" },
        { "date": "2025-12-05", "systolic": 149, "diastolic": 92, "status": "high" },
        { "date": "2026-02-08", "systolic": 155, "diastolic": 98, "status": "critical" }
      ],
      "LipidProfile": [
        { "date": "2025-02-10", "LDL": 142, "HDL": 38, "Triglycerides": 210, "TotalCholesterol": 218, "unit": "mg/dL", "status": "high" },
        { "date": "2025-08-18", "LDL": 128, "HDL": 40, "Triglycerides": 195, "TotalCholesterol": 201, "unit": "mg/dL", "status": "borderline" }
      ]
    },
    "visits": [
      { "date": "2025-02-10", "doctor": "Dr. Nandakumar", "department": "General Medicine & Diabetology", "chiefComplaint": "Polyuria, fatigue, increased thirst", "clinicalNote": "Patient presents with polyuria and fatigue. HbA1c elevated at 7.2%. Counselled on diabetic diet. Increased Metformin to 1000mg twice daily. BP noted at 142/88. Started Simvastatin 20mg.", "plan": "Repeat HbA1c in 3 months. Lipid recheck in 6 months. Diet counselling referral." },
      { "date": "2025-06-15", "doctor": "Dr. Nandakumar", "department": "General Medicine & Diabetology", "chiefComplaint": "BP not controlled, occasional dizziness", "clinicalNote": "BP poorly controlled at 150/94. HbA1c 8.1% — worsening. Added Amlodipine 5mg. Creatinine 1.3 — borderline, monitoring nephropathy.", "plan": "Review BP in 4 weeks. Repeat creatinine in 3 months." },
      { "date": "2025-10-10", "doctor": "Dr. Nandakumar", "department": "General Medicine & Diabetology", "chiefComplaint": "Routine follow-up, ankle swelling noted", "clinicalNote": "HbA1c 9.0% — significant worsening. Creatinine rising to 1.9, eGFR dropping. Referred for nephrology consult urgently. Beta-lactam antibiotic caution documented.", "plan": "Nephrology referral. Urine microalbumin test. Insulin counselling at next visit." },
      { "date": "2026-02-08", "doctor": "Dr. Jenson Isaac", "department": "General Medicine & Diabetology", "chiefComplaint": "Post-transfer follow-up, worsening kidney function", "clinicalNote": "HbA1c 9.4 — insulin initiation being considered. Creatinine 2.1. BP target not met — considering ARB addition. Cardiology referral initiated.", "plan": "Initiate insulin Glargine 10 units at night. Cardiology referral. Nephrology follow-up." }
    ],
    "clinicalFlags": [
      { "type": "CRITICAL", "flag": "HbA1c worsening — 7 consecutive visits", "evidence": "HbA1c rose from 7.2% (Feb 2025) to 9.4% (Feb 2026)", "recommendation": "Insulin initiation being considered — for physician review" },
      { "type": "CRITICAL", "flag": "BP uncontrolled despite Amlodipine", "evidence": "BP >140 on 9/9 visits. Latest: 155/98 mmHg", "recommendation": "Consider dose escalation or ARB addition — for physician review" },
      { "type": "HIGH", "flag": "Deteriorating renal function — CKD Stage 3", "evidence": "eGFR dropped from 72 to 51 mL/min. Creatinine 2.1 mg/dL", "recommendation": "Nephrology referral. Avoid nephrotoxic drugs — for physician review" },
      { "type": "MEDIUM", "flag": "Drug Interaction: Amlodipine + Simvastatin", "evidence": "Concurrent prescriptions since Jun 2025", "recommendation": "Monitor for myopathy symptoms. Limit Simvastatin to 20mg — for physician review" },
      { "type": "MEDIUM", "flag": "Beta-lactam antibiotic caution", "evidence": "Amoxicillin rash documented Oct 2025 visit (incident 2019)", "recommendation": "Avoid penicillin-class antibiotics — for physician review" }
    ],
    "overdueTests": [
      { "test": "Urine Microalbumin", "reason": "Annual nephropathy screen — never done", "overdueDays": 45, "labUrl": "https://www.1mg.com/lab-tests/microalbumin-urine-test-74" },
      { "test": "ECG", "reason": "Annual cardiac check for hypertension", "overdueDays": 30, "labUrl": null },
      { "test": "Lipid Profile", "reason": "6-monthly monitoring — last done Aug 2025", "overdueDays": 12, "labUrl": "https://www.1mg.com/lab-tests/lipid-profile-test-28" }
    ]
  },
  {
    "id": "P002",
    "name": "Meenakshi Pillai",
    "age": 45,
    "gender": "Female",
    "bloodGroup": "O+",
    "phone": "+91 94440 78901",
    "address": "22/5, GST Road, Guduvanchery, Chennai - 603202",
    "emergencyContact": "Suresh Pillai (Husband) — +91 94440 11223",
    "registeredAt": "Kathir Memorial Hospital",
    "primaryDiagnosis": ["Gestational Hypertension (O13)", "Hypothyroidism (E03)"],
    "secondaryDiagnosis": ["Iron Deficiency Anaemia (D50)"],
    "allergies": ["No known drug allergies"],
    "medications": [
      { "name": "Levothyroxine", "dose": "75mcg", "frequency": "Once daily — fasting, 30 mins before breakfast", "since": "2025-03-20", "indication": "Hypothyroidism — synthetic thyroid hormone replacement", "caution": "Do NOT take with iron supplements or calcium — take 4 hours apart", "reminder": ["06:30"] },
      { "name": "Ferrous Sulphate", "dose": "200mg", "frequency": "Twice daily after meals", "since": "2025-03-20", "indication": "Iron Deficiency Anaemia — iron supplementation", "caution": "Take 4 hours AFTER Levothyroxine. Causes dark stools — normal.", "reminder": ["13:00", "21:00"] },
      { "name": "Labetalol", "dose": "100mg", "frequency": "Twice daily", "since": "2025-05-10", "indication": "Hypertension — alpha and beta blocker, safe for women", "caution": "Do not stop abruptly. Monitor for bradycardia.", "reminder": ["09:00", "21:00"] }
    ],
    "labResults": {
      "TSH": [
        { "date": "2025-03-10", "value": 8.2, "unit": "mIU/L", "referenceRange": "0.4-4.0", "status": "critical" },
        { "date": "2025-06-15", "value": 6.1, "unit": "mIU/L", "referenceRange": "0.4-4.0", "status": "high" },
        { "date": "2025-09-20", "value": 3.8, "unit": "mIU/L", "referenceRange": "0.4-4.0", "status": "normal" },
        { "date": "2025-12-10", "value": 2.1, "unit": "mIU/L", "referenceRange": "0.4-4.0", "status": "normal" },
        { "date": "2026-02-15", "value": 4.8, "unit": "mIU/L", "referenceRange": "0.4-4.0", "status": "borderline" }
      ],
      "Haemoglobin": [
        { "date": "2025-03-10", "value": 8.4, "unit": "g/dL", "referenceRange": ">12.0", "status": "critical" },
        { "date": "2025-05-20", "value": 9.8, "unit": "g/dL", "referenceRange": ">12.0", "status": "high" },
        { "date": "2025-08-18", "value": 11.2, "unit": "g/dL", "referenceRange": ">12.0", "status": "borderline" },
        { "date": "2025-11-15", "value": 12.1, "unit": "g/dL", "referenceRange": ">12.0", "status": "normal" },
        { "date": "2026-02-15", "value": 11.6, "unit": "g/dL", "referenceRange": ">12.0", "status": "borderline" }
      ],
      "BloodPressure": [
        { "date": "2025-03-10", "systolic": 135, "diastolic": 85, "status": "borderline" },
        { "date": "2025-04-15", "systolic": 138, "diastolic": 88, "status": "high" },
        { "date": "2025-05-20", "systolic": 142, "diastolic": 90, "status": "high" },
        { "date": "2025-07-10", "systolic": 136, "diastolic": 84, "status": "borderline" },
        { "date": "2025-09-20", "systolic": 130, "diastolic": 82, "status": "normal" },
        { "date": "2025-11-15", "systolic": 128, "diastolic": 80, "status": "normal" },
        { "date": "2026-02-15", "systolic": 132, "diastolic": 84, "status": "borderline" }
      ],
      "SerumFerritin": [
        { "date": "2025-03-10", "value": 6, "unit": "ng/mL", "referenceRange": "12-150", "status": "critical" },
        { "date": "2025-08-18", "value": 28, "unit": "ng/mL", "referenceRange": "12-150", "status": "normal" },
        { "date": "2026-02-15", "value": 22, "unit": "ng/mL", "referenceRange": "12-150", "status": "normal" }
      ]
    },
    "visits": [
      { "date": "2025-03-10", "doctor": "Dr. Sharmila Ganesan", "department": "Obstetrics & Gynaecology", "chiefComplaint": "Fatigue, cold intolerance, weight gain, heavy periods", "clinicalNote": "Classical hypothyroid symptoms. TSH 8.2 — significantly elevated. Initiating Levothyroxine 50mcg. Haemoglobin critically low at 8.4 — iron deficiency anaemia confirmed. Starting Ferrous Sulphate 200mg twice daily. Counselled on 4-hour separation.", "plan": "Recheck TSH in 3 months. Haemoglobin in 3 months. BP monitoring." },
      { "date": "2025-05-10", "doctor": "Dr. Sharmila Ganesan", "department": "Obstetrics & Gynaecology", "chiefComplaint": "BP elevated on two consecutive readings", "clinicalNote": "BP 142/90 — gestational hypertension. Starting Labetalol 100mg. TSH 6.1 improving. Levothyroxine dose increased to 75mcg. Patient taking iron and thyroid tablet together — re-counselled.", "plan": "BP review in 4 weeks. Continue iron therapy." },
      { "date": "2025-08-18", "doctor": "Dr. Sharmila Ganesan", "department": "Obstetrics & Gynaecology", "chiefComplaint": "Routine follow-up", "clinicalNote": "Excellent treatment response. TSH 3.8 — normal. Haemoglobin 11.2 — near normal. BP responding to Labetalol.", "plan": "Continue all medications. Cardiology cross-referral." },
      { "date": "2026-02-15", "doctor": "Dr. Mugil", "department": "Cardiology", "chiefComplaint": "Cardiology cross-referral from Dr. Sharmila — BP management", "clinicalNote": "BP now 132/84 — reasonable control. TSH slight rise to 4.8. Drug timing conflict noted again. ECG normal.", "plan": "Continue Labetalol. OB/GYN review for Levothyroxine dose. Monitor Hb." }
    ],
    "clinicalFlags": [
      { "type": "MEDIUM", "flag": "TSH rising — possible dose review needed", "evidence": "TSH rose from 2.1 (Dec 2025) to 4.8 (Feb 2026)", "recommendation": "Consider Levothyroxine dose adjustment — for physician review" },
      { "type": "MEDIUM", "flag": "Drug Interaction: Levothyroxine + Ferrous Sulphate", "evidence": "Patient repeatedly noted to take both tablets together — documented 3x", "recommendation": "Strict 4-hour separation counselling — for physician review" },
      { "type": "LOW", "flag": "Haemoglobin slight dip from normal", "evidence": "Hb dropped from 12.1 (Nov 2025) to 11.6 (Feb 2026)", "recommendation": "Monitor. Continue iron supplementation — for physician review" }
    ],
    "overdueTests": [
      { "test": "Thyroid Function Test (TSH + T3 + T4)", "reason": "TSH borderline — full panel needed", "overdueDays": 0, "labUrl": "https://www.1mg.com/lab-tests/thyroid-profile-total-t3-t4-tsh-test-77" },
      { "test": "Complete Blood Count (CBC)", "reason": "Haemoglobin monitoring — every 3 months on iron therapy", "overdueDays": 5, "labUrl": "https://www.1mg.com/lab-tests/complete-blood-count-cbc-test-46" }
    ]
  },
  {
    "id": "P010",
    "name": "Unknown",
    "age": null,
    "gender": null,
    "bloodGroup": null,
    "primaryDiagnosis": ["Hypertension", "Hypertension (HTN)", "Diabetes Mellitus (DM)", "Chronic Kidney Disease (CKD)"],
    "secondaryDiagnosis": [],
    "allergies": [],
    "medications": [
      { "name": "T. Pan 40" }, { "name": "T. Telma 40" }, { "name": "T. Glycomet" },
      { "name": "T. Met XL 25" }, { "name": "T. Ecosprin 75" }, { "name": "Telma AM 40/5" },
      { "name": "Jalra M 50/500" }, { "name": "Atorva 10mg" }, { "name": "Augmentin 625mg" }
    ],
    "labResults": {
      "BloodPressure": [
        { "date": "2026-03-09", "systolic": 150, "diastolic": 90, "source": "OCR_INGESTION" }
      ],
      "HbA1c": [{ "date": "2026-03-09", "value": 8.4, "source": "OCR_INGESTION" }],
      "SerumCreatinine": [{ "date": "2026-03-09", "value": 1.8, "source": "OCR_INGESTION" }],
      "eGFR": [{ "date": "2026-03-09", "value": 45, "source": "OCR_INGESTION" }],
      "Haemoglobin": [{ "date": "2026-03-09", "value": 10.1, "source": "OCR_INGESTION" }]
    },
    "visits": [
      { "date": "2026-03-09", "doctor": "OCR Import", "department": "Medical Records", "chiefComplaint": "Dizziness, Body aches", "clinicalNote": "60-year-old male. BP 150/90. Diagnosed with hypertension. Prescribed Telma, Met XL, and Ecosprin.", "plan": "ECG", "source": "OCR_INGESTION" }
    ],
    "clinicalFlags": [
      { "type": "HIGH", "flag": "Poorly controlled hypertension", "evidence": "BP 150/90 on visit", "recommendation": "Physician review advised" },
      { "type": "HIGH", "flag": "Poorly controlled diabetes", "evidence": "HbA1c 8.4", "recommendation": "Physician review advised" }
    ],
    "overdueTests": [
      { "test": "HbA1c" }, { "test": "Serum Creatinine" }, { "test": "ECG" }
    ]
  }
];

// ─── USERS DATA ────────────────────────────────────────────────────────────────

const users = {
  "doctors": [
    { "id": "D001", "name": "Dr. Nandakumar", "email": "nandakumar@kathir.in", "password": "doctor123", "department": "General Medicine & Diabetology", "specialisation": "Diabetology", "patients": ["P001"] },
    { "id": "D002", "name": "Dr. Sharmila Ganesan", "email": "sharmila@kathir.in", "password": "doctor123", "department": "Obstetrics & Gynaecology", "specialisation": "OB/GYN", "patients": ["P002"] },
    { "id": "D003", "name": "Dr. Mugil", "email": "mugil@kathir.in", "password": "doctor123", "department": "Cardiology", "specialisation": "Cardiology", "patients": ["P002"] },
    { "id": "D004", "name": "Dr. Jenson Isaac", "email": "jenson@kathir.in", "password": "doctor123", "department": "Spine & Orthopaedics", "specialisation": "Orthopaedics", "patients": [] }
  ],
  "patients": [
    { "id": "P001", "name": "Rajan Subramaniam", "email": "rajan@patient.in", "password": "patient123" },
    { "id": "P002", "name": "Meenakshi Pillai", "email": "meenakshi@patient.in", "password": "patient123" }
  ]
};

// ─── SEED FUNCTION ─────────────────────────────────────────────────────────────

async function seed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    const db = client.db(DB_NAME);

    // ── Patients ──────────────────────────────────────────
    const patientCol = db.collection('patients');
    await patientCol.deleteMany({});  // clear old data
    const patientResult = await patientCol.insertMany(patients);
    console.log(`✅ Inserted ${patientResult.insertedCount} patients (P001, P002, P010)`);

    // ── Doctors ───────────────────────────────────────────
    const doctorCol = db.collection('doctors');
    await doctorCol.deleteMany({});
    const doctorResult = await doctorCol.insertMany(users.doctors);
    console.log(`✅ Inserted ${doctorResult.insertedCount} doctors`);

    // ── Users (for login) ─────────────────────────────────
    const userCol = db.collection('users');
    await userCol.deleteMany({});
    await userCol.insertOne(users);
    console.log('✅ Inserted users (doctors + patients login data)');

    console.log('\n🎉 All data seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Doctor  → nandakumar@kathir.in  / doctor123');
    console.log('   Doctor  → sharmila@kathir.in    / doctor123');
    console.log('   Patient → rajan@patient.in      / patient123');
    console.log('   Patient → meenakshi@patient.in  / patient123');
    console.log('\n🌐 Now visit: http://localhost:3000');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await client.close();
  }
}

seed();