"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, ArrowRight, HeartPulse, Plus, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchApi } from "@/lib/backend-api";

type Patient = {
  patient_id: string;
  name: string;
  age: number | null;
  gender: string;
  email?: string | null;
  phone?: string | null;
  blood_group?: string | null;
  diagnosis: string[];
  allergies: string[];
  status: string;
  lastVisit: string | null;
};

type PatientStatus = "all" | "critical" | "monitoring" | "stable";

type PatientForm = {
  name: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
  blood_group: string;
  diagnosis: string;
  allergies: string;
};

const EMPTY_FORM: PatientForm = {
  name: "",
  age: "",
  gender: "Unknown",
  email: "",
  phone: "",
  blood_group: "",
  diagnosis: "",
  allergies: "",
};

function normalizeStatus(status: string): Exclude<PatientStatus, "all"> {
  const value = status.toLowerCase();
  if (value.includes("critical") || value.includes("high")) return "critical";
  if (value.includes("monitor") || value.includes("medium")) return "monitoring";
  return "stable";
}

function formatDate(value: string | null) {
  if (!value) return "No visits yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchApi<Patient[]>("/api/patients");
      setPatients(Array.isArray(rows) ? rows : []);
    } catch {
      setLoadError("Patient records could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const counts = useMemo(() => ({
    all: patients.length,
    critical: patients.filter((patient) => normalizeStatus(patient.status) === "critical").length,
    monitoring: patients.filter((patient) => normalizeStatus(patient.status) === "monitoring").length,
    stable: patients.filter((patient) => normalizeStatus(patient.status) === "stable").length,
  }), [patients]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesSearch = !query || [patient.name, patient.patient_id, ...patient.diagnosis]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || normalizeStatus(patient.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  async function handleAddPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");
    try {
      await fetchApi<{ patient: Patient }>("/api/patients", {
        method: "POST",
        body: JSON.stringify({ ...form, age: form.age || null }),
      });
      setIsAddOpen(false);
      setForm(EMPTY_FORM);
      await loadPatients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save patient");
    } finally {
      setIsSaving(false);
    }
  }

  function updateForm(field: keyof PatientForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="patients-page">
      <header className="patients-heading">
        <div>
          <p className="patients-eyebrow">CARE DIRECTORY <span> / </span> PATIENTS</p>
          <h1>Patient records</h1>
          <p className="patients-subtitle">Find a patient record or add someone to your workspace.</p>
        </div>
        <button className="patients-primary" type="button" onClick={() => { setFormError(""); setIsAddOpen(true); }}>
          <Plus size={16} /> Add patient
        </button>
      </header>

      <section className="patients-summary" aria-label="Patient status summary">
        <SummaryItem icon={<Users size={18} />} label="All patients" value={counts.all} unavailable={loading || Boolean(loadError)} selected={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <SummaryItem icon={<AlertCircle size={18} />} label="Critical" value={counts.critical} unavailable={loading || Boolean(loadError)} tone="critical" selected={statusFilter === "critical"} onClick={() => setStatusFilter("critical")} />
        <SummaryItem icon={<Activity size={18} />} label="Monitoring" value={counts.monitoring} unavailable={loading || Boolean(loadError)} tone="monitoring" selected={statusFilter === "monitoring"} onClick={() => setStatusFilter("monitoring")} />
        <SummaryItem icon={<HeartPulse size={18} />} label="Stable" value={counts.stable} unavailable={loading || Boolean(loadError)} tone="stable" selected={statusFilter === "stable"} onClick={() => setStatusFilter("stable")} />
      </section>

      <section className="patients-directory">
        <div className="patients-toolbar">
          <label className="patients-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID, or diagnosis"
              aria-label="Search patients"
            />
          </label>
          <label className="patients-filter-label" htmlFor="patient-status-filter">Status</label>
          <select id="patient-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PatientStatus)}>
            <option value="all">All statuses</option>
            <option value="critical">Critical</option>
            <option value="monitoring">Monitoring</option>
            <option value="stable">Stable</option>
          </select>
          <span className="patients-result-count">{loading ? "Loading records" : `${filteredPatients.length} of ${patients.length} patients`}</span>
        </div>

        {loadError && (
          <div className="patients-error" role="alert">
            <AlertCircle size={17} /><span>{loadError}</span><button type="button" onClick={() => void loadPatients()}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="patients-loading" role="status"><span /><span /><span /><span /></div>
        ) : loadError ? null : filteredPatients.length === 0 ? (
          <div className="patients-empty">
            <span><Search size={20} /></span>
            <h2>{patients.length === 0 ? "No patient records yet" : "No matching patients"}</h2>
            <p>{patients.length === 0 ? "Add a patient to start building your care directory." : "Try changing the search terms or status filter."}</p>
            {patients.length === 0 ? (
              <button className="patients-secondary" type="button" onClick={() => setIsAddOpen(true)}><Plus size={15} /> Add patient</button>
            ) : (
              <button className="patients-secondary" type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className="patients-table-wrap">
            <table className="patients-table">
              <thead><tr><th>Patient</th><th>Diagnosis</th><th>Status</th><th>Last visit</th><th aria-label="Open record" /></tr></thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const status = normalizeStatus(patient.status);
                  const initials = patient.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={patient.patient_id}>
                      <td>
                        <Link className="patients-person" href={`/patients/${encodeURIComponent(patient.patient_id)}`}>
                          <span className="patients-avatar">{initials}</span>
                          <span><b>{patient.name}</b><small>{patient.patient_id}{patient.age !== null ? ` · ${patient.age} years` : ""} · {patient.gender || "Unknown"}</small></span>
                        </Link>
                      </td>
                      <td><div className="patients-diagnoses">{patient.diagnosis.length ? patient.diagnosis.slice(0, 2).map((diagnosis) => <span key={diagnosis}>{diagnosis}</span>) : <span className="patients-no-diagnosis">No diagnosis listed</span>}{patient.diagnosis.length > 2 && <small>+{patient.diagnosis.length - 2}</small>}</div></td>
                      <td><span className={`patients-status status-${status}`}><i />{status}</span></td>
                      <td className="patients-last-visit">{formatDate(patient.lastVisit)}</td>
                      <td><Link className="patients-open-link" href={`/patients/${encodeURIComponent(patient.patient_id)}`} aria-label={`Open ${patient.name} record`}><ArrowRight size={15} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setForm(EMPTY_FORM); setFormError(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add patient</DialogTitle>
            <DialogDescription>Save a new patient record to the clinical database.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPatient} className="patients-form">
            <label>Full name <b>*</b><input required maxLength={120} value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Patient name" /></label>
            <label>Age<input type="number" min="0" max="130" value={form.age} onChange={(event) => updateForm("age", event.target.value)} placeholder="Age" /></label>
            <label>Gender<select value={form.gender} onChange={(event) => updateForm("gender", event.target.value)}><option>Unknown</option><option>Female</option><option>Male</option><option>Other</option></select></label>
            <label>Blood group<input maxLength={12} value={form.blood_group} onChange={(event) => updateForm("blood_group", event.target.value)} placeholder="e.g. O+" /></label>
            <label>Email<input type="email" maxLength={254} value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="patient@example.com" /></label>
            <label>Phone<input type="tel" maxLength={32} value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Phone number" /></label>
            <label className="patients-form-wide">Diagnoses<input value={form.diagnosis} onChange={(event) => updateForm("diagnosis", event.target.value)} placeholder="Separate multiple diagnoses with commas" /></label>
            <label className="patients-form-wide">Allergies<input value={form.allergies} onChange={(event) => updateForm("allergies", event.target.value)} placeholder="Separate multiple allergies with commas" /></label>
            {formError && <p className="patients-form-error" role="alert">{formError}</p>}
            <DialogFooter className="patients-form-wide">
              <button type="button" className="patients-secondary" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</button>
              <button type="submit" className="patients-primary" disabled={isSaving}>{isSaving ? "Saving..." : "Save patient"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .patients-page { --patient-ink:#15313a; --patient-muted:#718487; --patient-line:#dbe6e3; --patient-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 38px; color:var(--patient-ink); }
        .patients-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:18px; margin-bottom:23px; }
        .patients-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.patients-eyebrow span { padding:0 5px; color:#a4b3b0; }
        .patients-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.patients-subtitle { margin:8px 0 0; color:var(--patient-muted); font-size:12px; }
        .patients-primary,.patients-secondary { display:inline-flex; min-height:38px; align-items:center; justify-content:center; gap:8px; padding:0 13px; border:1px solid var(--patient-green); border-radius:4px; color:#fff; background:var(--patient-green); font:inherit; font-size:11px; font-weight:650; text-decoration:none; cursor:pointer; white-space:nowrap; }.patients-primary:hover { background:#0d655b; }.patients-primary:disabled { opacity:.6; cursor:wait; }
        .patients-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:14px; border:1px solid var(--patient-line); background:#fff; }
        .patients-summary-item { display:flex; width:100%; min-height:82px; align-items:center; gap:12px; padding:15px 18px; border:0; background:#fff; text-align:left; cursor:pointer; }.patients-summary-item + .patients-summary-item { border-left:1px solid var(--patient-line); }.patients-summary-item:hover,.patients-summary-item.selected { background:#f7fbf9; }.patients-summary-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:#147d70; background:#eaf4f0; }.patients-summary-item.tone-critical .patients-summary-icon { color:#bd654d; background:#fbefeb; }.patients-summary-item.tone-monitoring .patients-summary-icon { color:#a57a38; background:#f7f0df; }.patients-summary-item.tone-stable .patients-summary-icon { color:#537a6c; background:#e8f1ed; }.patients-summary-value { display:block; font:400 22px/1 Georgia,serif; }.patients-summary-label { display:block; margin-top:5px; color:#718487; font-size:10px; }
        .patients-directory { border:1px solid var(--patient-line); background:#fff; }.patients-toolbar { display:flex; min-height:58px; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--patient-line); }.patients-search { display:flex; min-width:190px; max-width:360px; height:36px; flex:1; align-items:center; gap:9px; padding:0 10px; border:1px solid var(--patient-line); color:#78908d; background:#fff; }.patients-search:focus-within { border-color:#147d70; box-shadow:0 0 0 2px rgba(20,125,112,.1); }.patients-search input { width:100%; border:0; outline:0; color:var(--patient-ink); background:transparent; font:inherit; font-size:11px; }.patients-search input::placeholder { color:#96a8a5; }.patients-filter-label { color:#718487; font-size:10px; }.patients-toolbar select { height:36px; padding:0 27px 0 9px; border:1px solid var(--patient-line); border-radius:0; color:#52696c; background:#fff; font:inherit; font-size:10px; }.patients-result-count { margin-left:auto; color:#8a9b99; font-size:10px; white-space:nowrap; }
        .patients-table-wrap { overflow-x:auto; }.patients-table { width:100%; min-width:680px; border-collapse:collapse; text-align:left; }.patients-table th { padding:11px 14px; border-bottom:1px solid var(--patient-line); color:#829593; background:#fbfdfc; font-size:8px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; }.patients-table td { padding:11px 14px; border-bottom:1px solid #edf2f0; color:#718487; font-size:10px; }.patients-table tbody tr:last-child td { border-bottom:0; }.patients-table tbody tr:hover { background:#fbfdfc; }.patients-person { display:flex; align-items:center; gap:9px; color:inherit; text-decoration:none; }.patients-avatar { display:grid; width:32px; height:32px; flex:0 0 32px; place-items:center; color:#147d70; background:#eaf4f0; font-size:9px; font-weight:700; }.patients-person b { display:block; color:#15313a; font-size:10px; font-weight:650; }.patients-person small { display:block; margin-top:4px; color:#8a9b99; font-size:9px; }.patients-diagnoses { display:flex; max-width:300px; flex-wrap:wrap; align-items:center; gap:4px; }.patients-diagnoses span:not(.patients-no-diagnosis) { max-width:190px; overflow:hidden; padding:4px 6px; color:#52696c; background:#f1f6f3; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }.patients-diagnoses .patients-no-diagnosis { color:#9aabaa; font-size:9px; }.patients-diagnoses small { color:#718487; font-size:9px; }
        .patients-status { display:inline-flex; align-items:center; gap:6px; padding:4px 7px; font-size:9px; font-weight:650; text-transform:capitalize; white-space:nowrap; }.patients-status i { width:6px; height:6px; border-radius:50%; background:currentColor; }.patients-status.status-critical { color:#a84936; background:#fbefeb; }.patients-status.status-monitoring { color:#916b2c; background:#f7f0df; }.patients-status.status-stable { color:#537a6c; background:#e8f1ed; }.patients-last-visit { white-space:nowrap; }.patients-open-link { display:grid; width:28px; height:28px; place-items:center; color:#77908c; text-decoration:none; }.patients-open-link:hover { color:#147d70; background:#eaf4f0; }
        .patients-loading { display:grid; gap:0; padding:5px 14px; }.patients-loading span { height:53px; border-bottom:1px solid #edf2f0; background:linear-gradient(90deg,#fff 25%,#f2f7f4 40%,#fff 65%); background-size:350% 100%; animation:patients-shimmer 1.4s ease infinite; }@keyframes patients-shimmer { to { background-position:-100% 0; } }
        .patients-empty { display:grid; min-height:250px; align-content:center; justify-items:center; padding:30px 20px; text-align:center; }.patients-empty > span { display:grid; width:42px; height:42px; place-items:center; color:#147d70; background:#eaf4f0; }.patients-empty h2 { margin:12px 0 0; font-size:13px; font-weight:650; }.patients-empty p { margin:6px 0 14px; color:#829593; font-size:10px; }.patients-secondary { border-color:var(--patient-line); color:#52696c; background:white; }.patients-secondary:hover { border-color:#9fbab1; color:#147d70; background:#f7fbf9; }
        .patients-error { display:flex; align-items:center; gap:10px; margin:14px; padding:11px 12px; border:1px solid #efd1c8; color:#a84936; background:#fff5f1; font-size:11px; }.patients-error span { flex:1; }.patients-error button { border:0; color:#a84936; background:transparent; font:inherit; font-weight:700; text-decoration:underline; cursor:pointer; }
        .patients-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.patients-form label { display:grid; gap:6px; color:#52696c; font-size:11px; font-weight:650; }.patients-form label b { display:inline; color:#a84936; }.patients-form input,.patients-form select { width:100%; height:38px; padding:0 10px; border:1px solid #dbe6e3; border-radius:3px; color:#15313a; background:#fff; font:inherit; font-size:12px; }.patients-form input:focus,.patients-form select:focus { border-color:#147d70; outline:2px solid rgba(20,125,112,.12); }.patients-form-wide { grid-column:1/-1; }.patients-form-error { grid-column:1/-1; margin:0; color:#a84936; font-size:11px; }.patients-form [data-slot="dialog-footer"] { justify-content:flex-end; }
        @media (max-width:760px) { .patients-heading { align-items:flex-start; }.patients-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.patients-summary-item:nth-child(3) { border-left:0; border-top:1px solid var(--patient-line); }.patients-summary-item:nth-child(4) { border-top:1px solid var(--patient-line); }.patients-toolbar { flex-wrap:wrap; }.patients-search { max-width:none; flex-basis:100%; }.patients-result-count { margin-left:0; }.patients-filter-label { margin-left:2px; } }
        @media (max-width:480px) { .patients-heading { flex-direction:column; align-items:stretch; }.patients-heading h1 { font-size:28px; }.patients-primary { min-height:36px; }.patients-summary-item { min-height:72px; padding:12px; }.patients-summary-value { font-size:20px; }.patients-form { grid-template-columns:1fr; }.patients-form-wide { grid-column:auto; } }
      `}</style>
    </main>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  unavailable = false,
  tone = "all",
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unavailable?: boolean;
  tone?: PatientStatus;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`patients-summary-item tone-${tone} ${selected ? "selected" : ""}`} type="button" onClick={onClick} aria-pressed={selected}>
      <span className="patients-summary-icon">{icon}</span>
      <span><b className="patients-summary-value">{unavailable ? "--" : value.toLocaleString()}</b><small className="patients-summary-label">{label}</small></span>
    </button>
  );
}
