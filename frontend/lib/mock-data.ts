// Mock Hospital Data for Medical AI Dashboard

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  diagnosis: string[];
  allergies: string[];
  avatar?: string;
  status: "stable" | "critical" | "monitoring";
  lastVisit: string;
}

export interface Visit {
  patient_id: string;
  date: string;
  doctor_notes: string;
  symptoms: string[];
}

export interface LabResult {
  patient_id: string;
  test: string;
  value: number;
  unit: string;
  date: string;
  normalRange: { min: number; max: number };
}

export interface Medication {
  patient_id: string;
  drug: string;
  dose: string;
  frequency: string;
  start_date: string;
}

export interface DrugInteraction {
  drug_a: string;
  drug_b: string;
  severity: "High" | "Moderate" | "Low";
  risk: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  type: "drug_interaction" | "test_overdue" | "critical_value" | "pattern";
  severity: "high" | "medium" | "low";
  message: string;
  timestamp: string;
}

// Patients Data
export const patients: Patient[] = [
  {
    patient_id: "P001",
    name: "Rahul Sharma",
    age: 52,
    gender: "Male",
    diagnosis: ["Type 2 Diabetes", "Hypertension"],
    allergies: ["Penicillin"],
    status: "monitoring",
    lastVisit: "2025-01-12",
  },
  {
    patient_id: "P002",
    name: "Priya Patel",
    age: 45,
    gender: "Female",
    diagnosis: ["Hypothyroidism"],
    allergies: [],
    status: "stable",
    lastVisit: "2025-01-10",
  },
  {
    patient_id: "P003",
    name: "Amit Kumar",
    age: 68,
    gender: "Male",
    diagnosis: ["Chronic Kidney Disease", "Type 2 Diabetes"],
    allergies: ["Sulfa drugs", "Aspirin"],
    status: "critical",
    lastVisit: "2025-01-15",
  },
  {
    patient_id: "P004",
    name: "Sunita Devi",
    age: 35,
    gender: "Female",
    diagnosis: ["Asthma"],
    allergies: ["NSAIDs"],
    status: "stable",
    lastVisit: "2025-01-08",
  },
  {
    patient_id: "P005",
    name: "Vikram Singh",
    age: 58,
    gender: "Male",
    diagnosis: ["Coronary Artery Disease", "Hyperlipidemia"],
    allergies: [],
    status: "monitoring",
    lastVisit: "2025-01-14",
  },
  {
    patient_id: "P006",
    name: "Meera Gupta",
    age: 42,
    gender: "Female",
    diagnosis: ["Rheumatoid Arthritis"],
    allergies: ["Codeine"],
    status: "stable",
    lastVisit: "2025-01-11",
  },
];

// Lab Results Data
export const labResults: LabResult[] = [
  // Rahul Sharma - P001
  { patient_id: "P001", test: "HbA1c", value: 7.2, unit: "%", date: "2024-07-15", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P001", test: "HbA1c", value: 7.5, unit: "%", date: "2024-10-20", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P001", test: "HbA1c", value: 8.2, unit: "%", date: "2025-01-12", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P001", test: "Creatinine", value: 1.1, unit: "mg/dL", date: "2024-07-15", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P001", test: "Creatinine", value: 1.2, unit: "mg/dL", date: "2024-10-20", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P001", test: "Creatinine", value: 1.4, unit: "mg/dL", date: "2025-01-12", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P001", test: "Blood Pressure", value: 145, unit: "mmHg", date: "2025-01-12", normalRange: { min: 90, max: 120 } },
  { patient_id: "P001", test: "Cholesterol", value: 220, unit: "mg/dL", date: "2025-01-12", normalRange: { min: 0, max: 200 } },
  
  // Amit Kumar - P003
  { patient_id: "P003", test: "HbA1c", value: 8.5, unit: "%", date: "2024-08-10", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P003", test: "HbA1c", value: 9.1, unit: "%", date: "2024-11-15", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P003", test: "HbA1c", value: 9.8, unit: "%", date: "2025-01-15", normalRange: { min: 4.0, max: 5.6 } },
  { patient_id: "P003", test: "Creatinine", value: 2.5, unit: "mg/dL", date: "2024-08-10", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P003", test: "Creatinine", value: 3.2, unit: "mg/dL", date: "2024-11-15", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P003", test: "Creatinine", value: 3.8, unit: "mg/dL", date: "2025-01-15", normalRange: { min: 0.7, max: 1.3 } },
  { patient_id: "P003", test: "eGFR", value: 25, unit: "mL/min", date: "2025-01-15", normalRange: { min: 90, max: 120 } },

  // Vikram Singh - P005
  { patient_id: "P005", test: "Cholesterol", value: 245, unit: "mg/dL", date: "2024-09-05", normalRange: { min: 0, max: 200 } },
  { patient_id: "P005", test: "Cholesterol", value: 230, unit: "mg/dL", date: "2024-12-10", normalRange: { min: 0, max: 200 } },
  { patient_id: "P005", test: "Cholesterol", value: 215, unit: "mg/dL", date: "2025-01-14", normalRange: { min: 0, max: 200 } },
  { patient_id: "P005", test: "LDL", value: 165, unit: "mg/dL", date: "2025-01-14", normalRange: { min: 0, max: 100 } },
  { patient_id: "P005", test: "Triglycerides", value: 180, unit: "mg/dL", date: "2025-01-14", normalRange: { min: 0, max: 150 } },
];

// Medications Data
export const medications: Medication[] = [
  { patient_id: "P001", drug: "Metformin", dose: "500mg", frequency: "Twice daily", start_date: "2024-01-01" },
  { patient_id: "P001", drug: "Lisinopril", dose: "10mg", frequency: "Once daily", start_date: "2024-03-15" },
  { patient_id: "P001", drug: "Aspirin", dose: "81mg", frequency: "Once daily", start_date: "2024-01-01" },
  { patient_id: "P003", drug: "Insulin Glargine", dose: "20 units", frequency: "Once daily", start_date: "2023-06-01" },
  { patient_id: "P003", drug: "Metformin", dose: "1000mg", frequency: "Twice daily", start_date: "2022-01-15" },
  { patient_id: "P003", drug: "Amlodipine", dose: "5mg", frequency: "Once daily", start_date: "2023-08-20" },
  { patient_id: "P005", drug: "Atorvastatin", dose: "40mg", frequency: "Once daily", start_date: "2024-02-10" },
  { patient_id: "P005", drug: "Clopidogrel", dose: "75mg", frequency: "Once daily", start_date: "2024-02-10" },
  { patient_id: "P005", drug: "Metoprolol", dose: "50mg", frequency: "Twice daily", start_date: "2024-05-01" },
];

// Visits Data
export const visits: Visit[] = [
  { patient_id: "P001", date: "2025-01-12", doctor_notes: "Patient complains of fatigue and increased thirst. HbA1c elevated.", symptoms: ["fatigue", "thirst", "frequent urination"] },
  { patient_id: "P001", date: "2024-10-20", doctor_notes: "Routine diabetes follow-up. Medication compliance good.", symptoms: ["mild headache"] },
  { patient_id: "P003", date: "2025-01-15", doctor_notes: "Kidney function declining. Discussed dialysis options.", symptoms: ["swelling", "fatigue", "nausea"] },
  { patient_id: "P003", date: "2024-11-15", doctor_notes: "CKD progression noted. Adjusted medications.", symptoms: ["reduced appetite", "fatigue"] },
  { patient_id: "P005", date: "2025-01-14", doctor_notes: "Chest pain resolved. Stress test scheduled.", symptoms: ["occasional chest discomfort"] },
];

// Drug Interactions
export const drugInteractions: DrugInteraction[] = [
  { drug_a: "Warfarin", drug_b: "Aspirin", severity: "High", risk: "Increased bleeding risk" },
  { drug_a: "Metformin", drug_b: "Alcohol", severity: "Moderate", risk: "Lactic acidosis risk" },
  { drug_a: "Lisinopril", drug_b: "Potassium supplements", severity: "Moderate", risk: "Hyperkalemia" },
  { drug_a: "Metoprolol", drug_b: "Verapamil", severity: "High", risk: "Severe bradycardia" },
  { drug_a: "Atorvastatin", drug_b: "Grapefruit", severity: "Moderate", risk: "Increased statin levels" },
  { drug_a: "Clopidogrel", drug_b: "Omeprazole", severity: "Moderate", risk: "Reduced antiplatelet effect" },
];

// Alerts
export const alerts: Alert[] = [
  { id: "A001", patient_id: "P001", type: "critical_value", severity: "high", message: "HbA1c rising trend: 7.2% → 8.2% over 6 months", timestamp: "2025-01-12T10:30:00" },
  { id: "A002", patient_id: "P001", type: "test_overdue", severity: "medium", message: "Kidney function test overdue by 2 weeks", timestamp: "2025-01-12T10:30:00" },
  { id: "A003", patient_id: "P003", type: "critical_value", severity: "high", message: "eGFR critically low at 25 mL/min - Stage 4 CKD", timestamp: "2025-01-15T09:15:00" },
  { id: "A004", patient_id: "P003", type: "drug_interaction", severity: "medium", message: "Metformin may need dose adjustment due to kidney function", timestamp: "2025-01-15T09:15:00" },
  { id: "A005", patient_id: "P005", type: "pattern", severity: "medium", message: "Cholesterol decreasing but still above target", timestamp: "2025-01-14T14:00:00" },
  { id: "A006", patient_id: "P005", type: "test_overdue", severity: "low", message: "ECG due for annual review", timestamp: "2025-01-14T14:00:00" },
];

// AI Consultation Brief Generator
export function generateAIBrief(patientId: string): string {
  const patient = patients.find((p) => p.patient_id === patientId);
  if (!patient) return "Patient not found.";

  const patientLabs = labResults.filter((l) => l.patient_id === patientId);
  const patientMeds = medications.filter((m) => m.patient_id === patientId);
  const patientAlerts = alerts.filter((a) => a.patient_id === patientId);
  const recentVisit = visits.filter((v) => v.patient_id === patientId)[0];

  let brief = `**Patient Summary: ${patient.name}**\n\n`;
  brief += `${patient.age}-year-old ${patient.gender.toLowerCase()} with ${patient.diagnosis.join(", ")}.\n\n`;
  
  if (patient.allergies.length > 0) {
    brief += `⚠️ **Allergies:** ${patient.allergies.join(", ")}\n\n`;
  }

  brief += `**Current Medications:** ${patientMeds.map(m => `${m.drug} ${m.dose}`).join(", ")}\n\n`;

  if (patientAlerts.length > 0) {
    brief += `**Active Alerts:**\n`;
    patientAlerts.forEach(alert => {
      const icon = alert.severity === "high" ? "🔴" : alert.severity === "medium" ? "🟡" : "🟢";
      brief += `${icon} ${alert.message}\n`;
    });
    brief += "\n";
  }

  if (recentVisit) {
    brief += `**Last Visit (${recentVisit.date}):** ${recentVisit.doctor_notes}\n`;
    brief += `Symptoms: ${recentVisit.symptoms.join(", ")}\n\n`;
  }

  brief += `**Recommendations:**\n`;
  if (patient.patient_id === "P001") {
    brief += "• Consider increasing Metformin dose or adding second-line agent\n";
    brief += "• Schedule comprehensive metabolic panel\n";
    brief += "• Reinforce dietary counseling\n";
  } else if (patient.patient_id === "P003") {
    brief += "• Urgent nephrology consultation recommended\n";
    brief += "• Review and adjust renally-cleared medications\n";
    brief += "• Discuss dialysis access planning\n";
  } else if (patient.patient_id === "P005") {
    brief += "• Continue current statin therapy - showing improvement\n";
    brief += "• Schedule cardiac stress test\n";
    brief += "• Lifestyle modifications ongoing\n";
  }

  return brief;
}

// Helper function to get lab trend data for charts
export function getLabTrend(patientId: string, testName: string) {
  return labResults
    .filter((l) => l.patient_id === patientId && l.test === testName)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({
      date: l.date,
      value: l.value,
      normalMin: l.normalRange.min,
      normalMax: l.normalRange.max,
    }));
}
