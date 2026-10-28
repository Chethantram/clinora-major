"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleAlert,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/backend-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InteractionSeverity = "High" | "Moderate" | "Low";

interface Patient {
  patient_id: string;
  name: string;
  diagnosis?: string[];
}

interface Medication {
  med_id: string;
  patient_id: string;
  drug: string;
  dose: string;
  frequency: string;
  route?: string;
  start_date: string | null;
  end_date?: string | null;
  active?: boolean;
  prescribed_by?: string | null;
  record_type: "medication" | "prescription";
}

interface DrugInteraction {
  drug_a: string;
  drug_b: string;
  severity: InteractionSeverity;
  risk: string;
  action?: string;
}

interface MedicationOverview {
  patients: Patient[];
  medications: Medication[];
  drugInteractions: DrugInteraction[];
}

interface MedicationForm {
  patient_id: string;
  drug: string;
  dose: string;
  frequency: string;
  start_date: string;
}

const EMPTY_FORM: MedicationForm = {
  patient_id: "",
  drug: "",
  dose: "",
  frequency: "",
  start_date: new Date().toISOString().slice(0, 10),
};

const ALL_PATIENTS = "all";

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function drugKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function MedicationsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(ALL_PATIENTS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [form, setForm] = useState<MedicationForm>(EMPTY_FORM);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMedications = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetchApi<MedicationOverview>("/api/medications");
      setPatients(Array.isArray(response.patients) ? response.patients : []);
      setMedications(Array.isArray(response.medications) ? response.medications : []);
      setInteractions(Array.isArray(response.drugInteractions) ? response.drugInteractions : []);
    } catch {
      setLoadError("Medication data could not be loaded. Check your connection and try again.");
      setPatients([]);
      setMedications([]);
      setInteractions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  const activeMedications = useMemo(
    () => medications.filter((medication) => medication.active !== false),
    [medications]
  );
  const patientDrugKeys = useMemo(() => {
    const keys = new Map<string, Set<string>>();
    for (const medication of activeMedications) {
      const drugs = keys.get(medication.patient_id) || new Set<string>();
      drugs.add(drugKey(medication.drug));
      keys.set(medication.patient_id, drugs);
    }
    return keys;
  }, [activeMedications]);
  const matchedInteractions = useMemo(() => interactions.filter((interaction) => {
    const first = drugKey(interaction.drug_a);
    const second = drugKey(interaction.drug_b);
    if (selectedPatient !== ALL_PATIENTS) {
      const drugs = patientDrugKeys.get(selectedPatient);
      return Boolean(drugs?.has(first) && drugs.has(second));
    }
    const allDrugs = new Set(activeMedications.map((medication) => drugKey(medication.drug)));
    return allDrugs.has(first) && allDrugs.has(second);
  }), [interactions, selectedPatient, patientDrugKeys, activeMedications]);

  const filteredMedications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return medications.filter((medication) => {
      const patient = patients.find((item) => item.patient_id === medication.patient_id);
      const matchesPatient = selectedPatient === ALL_PATIENTS || medication.patient_id === selectedPatient;
      const matchesSearch = !query
        || medication.drug.toLowerCase().includes(query)
        || medication.dose.toLowerCase().includes(query)
        || patient?.name.toLowerCase().includes(query)
        || medication.patient_id.toLowerCase().includes(query);
      return matchesPatient && matchesSearch;
    });
  }, [medications, patients, search, selectedPatient]);

  const patientOptions = useMemo(() => patients.filter((patient) => medications.some((medication) => medication.patient_id === patient.patient_id)), [patients, medications]);
  const highRiskCount = matchedInteractions.filter((interaction) => interaction.severity === "High").length;
  const moderateRiskCount = matchedInteractions.filter((interaction) => interaction.severity === "Moderate").length;
  const uniqueDrugs = new Set(activeMedications.map((medication) => drugKey(medication.drug))).size;

  function openAddDialog() {
    setEditingMedication(null);
    setForm({ ...EMPTY_FORM, patient_id: selectedPatient === ALL_PATIENTS ? (patients[0]?.patient_id || "") : selectedPatient });
    setFormMessage("");
    setIsDialogOpen(true);
  }

  function openEditDialog(medication: Medication) {
    setEditingMedication(medication);
    setForm({
      patient_id: medication.patient_id,
      drug: medication.drug,
      dose: medication.dose,
      frequency: medication.frequency,
      start_date: medication.start_date?.slice(0, 10) || "",
    });
    setFormMessage("");
    setIsDialogOpen(true);
  }

  async function saveMedication() {
    if (!form.patient_id || !form.drug.trim() || !form.dose.trim() || !form.frequency.trim()) {
      setFormMessage("Patient, medication, dose, and frequency are required.");
      return;
    }
    setSaving(true);
    setFormMessage("");
    const editing = editingMedication !== null;
    const path = editing
      ? `/api/medications/${encodeURIComponent(editingMedication.med_id)}`
      : "/api/medications/prescriptions";
    try {
      const response = await fetchApi<{ medication?: Medication; prescription?: Medication }>(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          drug: form.drug.trim(),
          dose: form.dose.trim(),
          frequency: form.frequency.trim(),
          record_type: editingMedication?.record_type,
        }),
      });
      const saved = response.medication || response.prescription;
      if (!saved) throw new Error("Medication response was incomplete");
      setMedications((current) => editing
        ? current.map((medication) => medication.med_id === saved.med_id ? saved : medication)
        : [saved, ...current]);
      setSelectedPatient(form.patient_id);
      setFormMessage(editing ? "Medication updated." : "Prescription added.");
      if (!editing) setForm(EMPTY_FORM);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Medication could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="medications-page">
      <header className="medications-heading">
        <div>
          <p className="medications-eyebrow">CARE MANAGEMENT <span>/</span> MEDICATIONS</p>
          <h1>Medication records</h1>
          <p className="medications-subtitle">Review prescriptions and potential drug interactions.</p>
        </div>
        <div className="medications-heading-actions">
          <button className="medications-icon-button" type="button" onClick={() => void loadMedications()} disabled={loading} aria-label="Refresh medication data" title="Refresh medication data"><RefreshCw size={15} className={loading ? "medications-spin" : ""} /></button>
          <button className="medications-primary" type="button" onClick={openAddDialog} disabled={patients.length === 0}><Plus size={15} /> Add prescription</button>
        </div>
      </header>

      <section className="medications-summary" aria-label="Medication summary">
        <SummaryItem icon={<Pill size={17} />} label="Active medications" value={activeMedications.length} />
        <SummaryItem icon={<ShieldCheck size={17} />} label="Unique medicines" value={uniqueDrugs} />
        <SummaryItem icon={<AlertTriangle size={17} />} label="Moderate interactions" value={moderateRiskCount} tone="moderate" />
        <SummaryItem icon={<CircleAlert size={17} />} label="High-risk interactions" value={highRiskCount} tone="critical" />
      </section>

      {loadError && <div className="medications-error" role="alert"><AlertTriangle size={16} /><span>{loadError}</span><button type="button" onClick={() => void loadMedications()}>Retry</button></div>}

      <section className="medications-toolbar">
        <label className="medications-search"><Search size={15} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or medication" aria-label="Search medications" /></label>
        <label className="medications-filter-label" htmlFor="medication-patient-filter">Patient</label>
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger id="medication-patient-filter" className="medications-select"><SelectValue placeholder="All patients" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL_PATIENTS}>All patients</SelectItem>{patientOptions.map((patient) => <SelectItem key={patient.patient_id} value={patient.patient_id}>{patient.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="medications-result-count">{loading ? "Loading records" : `${filteredMedications.length} of ${medications.length} records`}</span>
      </section>

      <div className="medications-main-grid">
        <section className="medications-panel medications-records-panel" aria-label="Medication records">
          <div className="medications-panel-heading"><div><h2>Prescriptions and medications</h2><p>Patient medication records from the clinical database.</p></div><span>{filteredMedications.length} records</span></div>
          {loading && medications.length === 0 ? <div className="medications-loading" role="status"><span /><span /><span /><span /></div> : loadError ? null : filteredMedications.length === 0 ? (
            <div className="medications-empty"><span><Pill size={19} /></span><h3>{medications.length === 0 ? "No medication records" : "No matching records"}</h3><p>{medications.length === 0 ? "Saved prescriptions and medication history will appear here." : "Try adjusting your search or patient filter."}</p>{medications.length > 0 && <button type="button" onClick={() => { setSearch(""); setSelectedPatient(ALL_PATIENTS); }}>Clear filters</button>}</div>
          ) : (
            <div className="medications-table-wrap">
              <table className="medications-table">
                <thead><tr><th>Patient</th><th>Medication</th><th>Dose</th><th>Frequency</th><th>Started</th><th>Status</th><th /></tr></thead>
                <tbody>{filteredMedications.map((medication) => {
                  const patient = patients.find((item) => item.patient_id === medication.patient_id);
                  const isActive = medication.active !== false;
                  return <tr key={`${medication.record_type}-${medication.med_id}`}>
                    <td><Link className="medications-patient-link" href={`/patients/${encodeURIComponent(medication.patient_id)}`}><b>{patient?.name || medication.patient_id}</b><small>{medication.patient_id}</small></Link></td>
                    <td><span className="medications-drug"><Pill size={13} />{medication.drug}</span><small className="medications-source">{medication.record_type === "prescription" ? "Prescription" : "Medication history"}</small></td>
                    <td>{medication.dose || "Not recorded"}</td><td>{medication.frequency || "Not recorded"}</td><td>{formatDate(medication.start_date)}</td>
                    <td><span className={`medications-status${isActive ? " is-active" : " is-inactive"}`}><i />{isActive ? "Active" : "Inactive"}</span></td>
                    <td>{medication.med_id && <button className="medications-edit" type="button" onClick={() => openEditDialog(medication)}>Edit</button>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="medications-panel medications-interactions-panel">
          <div className="medications-panel-heading"><div><h2>Potential interactions</h2><p>{selectedPatient === ALL_PATIENTS ? "Among medicines in this workspace" : `For ${patients.find((patient) => patient.patient_id === selectedPatient)?.name || "selected patient"}`}</p></div><span>{matchedInteractions.length}</span></div>
          {matchedInteractions.length === 0 ? (
            <div className="medications-interactions-empty"><Check size={16} /><p>No listed interaction pairs match the current medication records.</p></div>
          ) : (
            <div className="medications-interaction-list">{matchedInteractions.map((interaction, index) => (
              <article key={`${interaction.drug_a}-${interaction.drug_b}-${index}`} className={`medications-interaction severity-${interaction.severity.toLowerCase()}`}>
                <span className="medications-severity">{interaction.severity}</span>
                <div className="medications-interaction-pair"><b>{interaction.drug_a}</b><ArrowRight size={13} /><b>{interaction.drug_b}</b></div>
                <p>{interaction.risk}</p>
                {interaction.action && <small>{interaction.action}</small>}
              </article>
            ))}</div>
          )}
          <p className="medications-clinical-note">Review interaction information against the patient’s full clinical context.</p>
        </aside>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingMedication ? "Edit medication record" : "Add prescription"}</DialogTitle><DialogDescription>{editingMedication ? "Update the saved medication details." : "Save a prescription to the patient record."}</DialogDescription></DialogHeader>
          <div className="medications-form">
            <label>Patient<select value={form.patient_id} onChange={(event) => setForm((current) => ({ ...current, patient_id: event.target.value }))}>{patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.name} ({patient.patient_id})</option>)}</select></label>
            <label>Medication<input value={form.drug} onChange={(event) => setForm((current) => ({ ...current, drug: event.target.value }))} maxLength={120} placeholder="Medication name" /></label>
            <div className="medications-form-row"><label>Dose<input value={form.dose} onChange={(event) => setForm((current) => ({ ...current, dose: event.target.value }))} maxLength={80} placeholder="e.g. 500 mg" /></label><label>Frequency<input value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))} maxLength={120} placeholder="e.g. Twice daily" /></label></div>
            <label>Start date<input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></label>
            {formMessage && <p className="medications-form-message" role="status">{formMessage}</p>}
          </div>
          <DialogFooter><button type="button" className="medications-secondary" onClick={() => setIsDialogOpen(false)}>Cancel</button><button type="button" className="medications-primary" onClick={() => void saveMedication()} disabled={saving}>{saving ? "Saving..." : editingMedication ? "Save changes" : "Save prescription"}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .medications-page { --med-ink:#15313a; --med-muted:#718487; --med-line:#dbe6e3; --med-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 38px; color:var(--med-ink); }
        .medications-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:23px; }.medications-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.medications-eyebrow span { padding:0 5px; color:#a4b3b0; }.medications-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.medications-subtitle { margin:8px 0 0; color:var(--med-muted); font-size:12px; }.medications-heading-actions { display:flex; align-items:center; gap:7px; }
        .medications-primary,.medications-secondary,.medications-icon-button { display:inline-flex; min-height:36px; align-items:center; justify-content:center; gap:7px; padding:0 11px; border:1px solid var(--med-line); border-radius:3px; color:#52696c; background:#fff; font:inherit; font-size:10px; text-decoration:none; white-space:nowrap; cursor:pointer; }.medications-primary { border-color:var(--med-green) !important; color:#fff !important; background:var(--med-green) !important; font-weight:650; }.medications-primary:hover:not(:disabled) { color:#fff !important; background:#0d655b !important; }.medications-secondary:hover,.medications-icon-button:hover { border-color:#9fbab1; color:var(--med-green); background:#f7fbf9; }.medications-primary:disabled,.medications-secondary:disabled,.medications-icon-button:disabled { opacity:.55; cursor:wait; }.medications-icon-button { width:36px; padding:0; }.medications-spin { animation:medications-spin 1s linear infinite; }@keyframes medications-spin { to { transform:rotate(360deg); } }
        .medications-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:14px; border:1px solid var(--med-line); background:#fff; }.medications-summary-item { display:flex; min-height:78px; align-items:center; gap:12px; padding:14px 17px; }.medications-summary-item + .medications-summary-item { border-left:1px solid var(--med-line); }.medications-summary-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--med-green); background:#eaf4f0; }.medications-summary-item.tone-moderate .medications-summary-icon { color:#916b2c; background:#f7f0df; }.medications-summary-item.tone-critical .medications-summary-icon { color:#a84936; background:#fbefeb; }.medications-summary-value { display:block; font:400 22px/1 Georgia,serif; }.medications-summary-label { display:block; margin-top:5px; color:#718487; font-size:10px; }
        .medications-error { display:flex; align-items:center; gap:9px; margin-bottom:14px; padding:11px 12px; border:1px solid #efd1c8; color:#a84936; background:#fff5f1; font-size:10px; }.medications-error span { flex:1; }.medications-error button { border:0; color:#a84936; background:transparent; font:inherit; font-weight:700; text-decoration:underline; cursor:pointer; }
        .medications-toolbar { display:flex; min-height:58px; align-items:center; gap:10px; margin-bottom:14px; padding:10px 14px; border:1px solid var(--med-line); background:#fff; }.medications-search { display:flex; min-width:190px; max-width:400px; height:36px; flex:1; align-items:center; gap:9px; padding:0 10px; border:1px solid var(--med-line); color:#78908d; background:#fff; }.medications-search:focus-within { border-color:var(--med-green); box-shadow:0 0 0 2px rgba(20,125,112,.1); }.medications-search input { width:100%; border:0; outline:0; color:var(--med-ink); background:transparent; font:inherit; font-size:10px; }.medications-search input::placeholder { color:#96a8a5; }.medications-filter-label { color:#718487; font-size:10px; }.medications-select { width:190px; height:36px; border-color:var(--med-line); border-radius:0; color:#52696c; background:#fff; font-size:10px; }.medications-select:focus { border-color:var(--med-green); box-shadow:0 0 0 2px rgba(20,125,112,.1); }.medications-result-count { color:#8a9b99; font-size:10px; white-space:nowrap; }
        .medications-main-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,340px); align-items:start; gap:14px; }.medications-panel { min-width:0; border:1px solid var(--med-line); background:#fff; }.medications-records-panel,.medications-interactions-panel { padding:16px 17px; }.medications-panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:12px; }.medications-panel-heading h2 { margin:0; color:#29464a; font-size:12px; font-weight:700; }.medications-panel-heading p { margin:5px 0 0; color:#829593; font-size:10px; }.medications-panel-heading > span { color:#829593; font-size:9px; white-space:nowrap; }
        .medications-table-wrap { overflow-x:auto; }.medications-table { width:100%; min-width:680px; border-collapse:collapse; text-align:left; }.medications-table th { padding:10px 9px; border-bottom:1px solid var(--med-line); color:#829593; background:#fbfdfc; font-size:8px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }.medications-table td { padding:11px 9px; border-bottom:1px solid #edf2f0; color:#52696c; font-size:9px; vertical-align:middle; }.medications-table tbody tr:last-child td { border-bottom:0; }.medications-table tbody tr:hover { background:#fbfdfc; }.medications-patient-link { display:grid; gap:3px; color:#29464a; text-decoration:none; }.medications-patient-link:hover b { color:var(--med-green); }.medications-patient-link b { font-size:9px; font-weight:650; }.medications-patient-link small,.medications-source { color:#8a9b99; font-size:8px; }.medications-drug { display:flex; align-items:center; gap:5px; color:#29464a; font-size:9px; font-weight:650; }.medications-drug svg { flex:0 0 auto; color:var(--med-green); }.medications-source { display:block; margin:4px 0 0 18px; }.medications-status { display:inline-flex; align-items:center; gap:5px; color:#a84936; font-size:8px; font-weight:650; }.medications-status i { width:6px; height:6px; background:currentColor; }.medications-status.is-active { color:#537a6c; }.medications-status.is-inactive { color:#829593; }.medications-edit { padding:4px 6px; border:0; color:var(--med-green); background:transparent; font:inherit; font-size:9px; font-weight:650; cursor:pointer; }.medications-edit:hover { text-decoration:underline; }
        .medications-interaction-list { display:grid; gap:7px; }.medications-interaction { padding:10px; border:1px solid #e8efec; border-left:2px solid #849a91; background:#fbfdfc; }.medications-interaction.severity-high { border-color:#efd1c8; border-left-color:#bd654d; background:#fff8f5; }.medications-interaction.severity-moderate { border-color:#e9dfc4; border-left-color:#a57a38; background:#fffdf7; }.medications-severity { display:inline-block; margin-bottom:6px; padding:3px 5px; color:#537a6c; background:#e8f1ed; font-size:8px; font-weight:700; }.severity-high .medications-severity { color:#a84936; background:#fbefeb; }.severity-moderate .medications-severity { color:#916b2c; background:#f7f0df; }.medications-interaction-pair { display:flex; align-items:center; gap:6px; color:#29464a; font-size:9px; }.medications-interaction-pair svg { flex:0 0 auto; color:#829593; }.medications-interaction > p,.medications-interaction > small { display:block; margin:6px 0 0; color:#718487; font-size:9px; line-height:1.5; }.medications-interaction > small { color:#8a9b99; }.medications-interactions-empty { display:flex; align-items:flex-start; gap:8px; padding:11px 9px; color:#537a6c; background:#f5faf7; }.medications-interactions-empty svg { flex:0 0 auto; }.medications-interactions-empty p { margin:0; font-size:9px; line-height:1.5; }.medications-clinical-note { margin:11px 0 0; padding-top:9px; border-top:1px solid #edf2f0; color:#8a9b99; font-size:8px; line-height:1.5; }
        .medications-empty { display:grid; min-height:250px; align-content:center; justify-items:center; padding:24px; text-align:center; }.medications-empty > span { display:grid; width:42px; height:42px; place-items:center; color:var(--med-green); background:#eaf4f0; }.medications-empty h3 { margin:12px 0 0; color:#29464a; font-size:12px; font-weight:650; }.medications-empty p { margin:6px 0 12px; color:#829593; font-size:10px; }.medications-empty button { padding:0; border:0; color:var(--med-green); background:transparent; font:inherit; font-size:10px; font-weight:650; text-decoration:underline; cursor:pointer; }.medications-loading { display:grid; padding:5px 10px; }.medications-loading span { height:53px; border-bottom:1px solid #edf2f0; background:linear-gradient(90deg,#fff 25%,#f2f7f4 40%,#fff 65%); background-size:350% 100%; animation:medications-shimmer 1.4s ease infinite; }@keyframes medications-shimmer { to { background-position:-100% 0; } }
        .medications-form { display:grid; gap:12px; padding:8px 0; }.medications-form label { display:grid; gap:6px; color:#52696c; font-size:10px; font-weight:650; }.medications-form input,.medications-form select { width:100%; height:36px; padding:0 9px; border:1px solid var(--med-line); border-radius:2px; color:#29464a; background:#fff; font:inherit; font-size:11px; }.medications-form input:focus,.medications-form select:focus { border-color:var(--med-green); outline:2px solid rgba(20,125,112,.12); }.medications-form-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.medications-form-message { margin:0; color:#a84936; font-size:10px; }
        @media (max-width:900px) { .medications-main-grid { grid-template-columns:minmax(0,1fr) minmax(250px,300px); }.medications-records-panel,.medications-interactions-panel { padding:13px; } }
        @media (max-width:760px) { .medications-heading { align-items:flex-start; }.medications-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.medications-summary-item:nth-child(3) { border-left:0; border-top:1px solid var(--med-line); }.medications-summary-item:nth-child(4) { border-top:1px solid var(--med-line); }.medications-toolbar { flex-wrap:wrap; }.medications-search { max-width:none; flex-basis:100%; }.medications-result-count { margin-left:auto; }.medications-main-grid { grid-template-columns:1fr; } }
        @media (max-width:480px) { .medications-page { padding-top:0; }.medications-heading { flex-direction:column; align-items:stretch; }.medications-heading h1 { font-size:28px; }.medications-heading-actions { align-self:flex-start; }.medications-summary-item { min-height:72px; padding:12px; }.medications-summary-value { font-size:20px; }.medications-filter-label { margin-left:2px; }.medications-select { flex:1; width:auto; }.medications-result-count { margin-left:0; width:100%; }.medications-form-row { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}

function SummaryItem({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "moderate" | "critical" }) {
  return <div className={`medications-summary-item${tone ? ` tone-${tone}` : ""}`}><span className="medications-summary-icon">{icon}</span><span><b className="medications-summary-value">{value}</b><small className="medications-summary-label">{label}</small></span></div>;
}