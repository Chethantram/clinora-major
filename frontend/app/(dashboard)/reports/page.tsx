"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  Download,
  FileText,
  Pill,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchApi } from "@/lib/backend-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Patient {
  patient_id: string;
  name: string;
  status?: string;
  diagnosis?: string[];
  lastVisit?: string | null;
}

interface LabResult {
  patient_id: string;
  test?: string;
  value?: number | null;
  date?: string | null;
  unit?: string;
  status?: string;
}

interface Visit {
  patient_id: string;
  date?: string | null;
}

interface Medication {
  patient_id: string;
  drug?: string;
  dose?: string;
  frequency?: string;
  start_date?: string | null;
}

interface ClinicalAlert {
  patient_id: string;
  severity?: string;
  message?: string;
  type?: string;
  timestamp?: string | null;
}

interface ReportData {
  patients: Patient[];
  labResults: LabResult[];
  medications: Medication[];
  alerts: ClinicalAlert[];
  visits: Visit[];
}

type ReportType = "clinical-overview" | "patient-summary" | "lab-results" | "medication" | "critical-alerts";

const EMPTY_REPORT: ReportData = {
  patients: [],
  labResults: [],
  medications: [],
  alerts: [],
  visits: [],
};

const STATUS_COLORS = { Stable: "#147d70", Monitoring: "#a57a38", Critical: "#bd654d" };

const REPORT_CATALOG: Array<{ id: Exclude<ReportType, "clinical-overview">; title: string; detail: string; icon: typeof Users }> = [
  { id: "patient-summary", title: "Patient summary", detail: "Patient status and diagnoses", icon: Users },
  { id: "lab-results", title: "Lab results", detail: "Recorded lab values and status", icon: Activity },
  { id: "medication", title: "Medication report", detail: "Prescriptions and medication history", icon: Pill },
  { id: "critical-alerts", title: "Critical alerts", detail: "High-priority clinical alerts", icon: Bell },
];

function normalizePatientStatus(status: string | undefined) {
  const value = String(status || "").toLowerCase();
  if (value.includes("critical") || value.includes("high")) return "Critical";
  if (value.includes("monitor") || value.includes("medium")) return "Monitoring";
  return "Stable";
}

function normalizeAlertSeverity(severity: string | undefined) {
  const value = String(severity || "").toLowerCase();
  if (["critical", "high", "urgent", "severe"].includes(value)) return "Critical";
  if (["moderate", "medium", "warning", "monitoring"].includes(value)) return "Moderate";
  return "Low";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isCustomReportOpen, setIsCustomReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("clinical-overview");
  const [reportTitle, setReportTitle] = useState("Clinical overview");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [reportMessage, setReportMessage] = useState("");

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetchApi<ReportData>("/api/reports/data");
      setData({
        patients: Array.isArray(response.patients) ? response.patients : [],
        labResults: Array.isArray(response.labResults) ? response.labResults : [],
        medications: Array.isArray(response.medications) ? response.medications : [],
        alerts: Array.isArray(response.alerts) ? response.alerts : [],
        visits: Array.isArray(response.visits) ? response.visits : [],
      });
      setLastUpdated(new Date().toISOString());
    } catch {
      setLoadError("Report data could not be loaded. Check your connection and try again.");
      setData(EMPTY_REPORT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const statusData = useMemo(() => {
    const counts = { Stable: 0, Monitoring: 0, Critical: 0 };
    data.patients.forEach((patient) => { counts[normalizePatientStatus(patient.status)] += 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] }));
  }, [data.patients]);

  const diagnosisData = useMemo(() => {
    const counts = new Map<string, number>();
    data.patients.forEach((patient) => (patient.diagnosis || []).forEach((diagnosis) => {
      counts.set(diagnosis, (counts.get(diagnosis) || 0) + 1);
    }));
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((first, second) => second.count - first.count).slice(0, 8);
  }, [data.patients]);

  const alertsBySeverity = useMemo(() => {
    const counts = { Critical: 0, Moderate: 0, Low: 0 };
    data.alerts.forEach((alert) => { counts[normalizeAlertSeverity(alert.severity)] += 1; });
    return [
      { name: "Critical", count: counts.Critical, fill: "#bd654d" },
      { name: "Moderate", count: counts.Moderate, fill: "#a57a38" },
      { name: "Low", count: counts.Low, fill: "#78958a" },
    ];
  }, [data.alerts]);

  const monthlyActivity = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { key, month: date.toLocaleDateString("en", { month: "short" }), visits: 0, labs: 0 };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));
    data.visits.forEach((visit) => {
      const date = visit.date ? new Date(visit.date) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const row = byMonth.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      if (row) row.visits += 1;
    });
    data.labResults.forEach((lab) => {
      const date = lab.date ? new Date(lab.date) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const row = byMonth.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      if (row) row.labs += 1;
    });
    return months.map(({ month, visits, labs }) => ({ month, visits, labs }));
  }, [data.visits, data.labResults]);

  const summary = [
    { label: "Patients", value: data.patients.length, icon: <Users size={17} /> },
    { label: "Lab results", value: data.labResults.length, icon: <Activity size={17} /> },
    { label: "Medication records", value: data.medications.length, icon: <Pill size={17} /> },
    { label: "Clinical alerts", value: data.alerts.length, icon: <Bell size={17} />, critical: alertsBySeverity[0].count > 0 },
  ];

  const patientNames = useMemo(() => new Map(data.patients.map((patient) => [patient.patient_id, patient.name])), [data.patients]);

  function getReportRows(type: ReportType): { headers: string[]; rows: unknown[][] } {
    if (type === "patient-summary") return {
      headers: ["Patient ID", "Patient", "Status", "Diagnoses", "Last visit"],
      rows: data.patients.map((patient) => [patient.patient_id, patient.name, normalizePatientStatus(patient.status), (patient.diagnosis || []).join("; "), patient.lastVisit || ""]),
    };
    if (type === "lab-results") return {
      headers: ["Patient ID", "Patient", "Test", "Value", "Unit", "Status", "Date"],
      rows: data.labResults.map((lab) => [lab.patient_id, patientNames.get(lab.patient_id) || "Unknown patient", lab.test || "", lab.value ?? "", lab.unit || "", lab.status || "", lab.date || ""]),
    };
    if (type === "medication") return {
      headers: ["Patient ID", "Patient", "Medication", "Dose", "Frequency", "Start date"],
      rows: data.medications.map((medication) => [medication.patient_id, patientNames.get(medication.patient_id) || "Unknown patient", medication.drug || "", medication.dose || "", medication.frequency || "", medication.start_date || ""]),
    };
    if (type === "critical-alerts") return {
      headers: ["Patient ID", "Patient", "Type", "Severity", "Message", "Date"],
      rows: data.alerts.filter((alert) => normalizeAlertSeverity(alert.severity) === "Critical")
        .map((alert) => [alert.patient_id, patientNames.get(alert.patient_id) || "Unknown patient", alert.type || "", alert.severity || "", alert.message || "", alert.timestamp || ""]),
    };
    return {
      headers: ["Dataset", "Records"],
      rows: [["Patients", data.patients.length], ["Visits", data.visits.length], ["Lab results", data.labResults.length], ["Medication records", data.medications.length], ["Clinical alerts", data.alerts.length]],
    };
  }

  function downloadCsv(type: ReportType, title?: string) {
    const { headers, rows } = getReportRows(type);
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    const fileTitle = title || type;
    link.href = url;
    link.download = `${fileTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function generatePrintableReport() {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      setReportMessage("Allow pop-ups to print or save this report as PDF.");
      return;
    }

    const { headers, rows } = getReportRows(reportType);
    const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const includedSummary = includeSummary
      ? `<section class="metrics"><div><b>${data.patients.length}</b><span>Patients</span></div><div><b>${data.visits.length}</b><span>Visits</span></div><div><b>${data.labResults.length}</b><span>Lab results</span></div><div><b>${data.alerts.length}</b><span>Alerts</span></div></section>`
      : "";
    const generatedAt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title><style>@page{size:A4 landscape;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#15313a;margin:0}header{border-bottom:2px solid #147d70;padding-bottom:14px;margin-bottom:20px}h1{font:400 24px Georgia,serif;margin:0 0 7px}.meta{color:#718487;font-size:10px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 20px}.metrics div{padding:12px;border:1px solid #dbe6e3;background:#f7fbf9}.metrics b,.metrics span{display:block}.metrics b{font:22px Georgia,serif}.metrics span{margin-top:5px;color:#718487;font-size:10px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #dbe6e3;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f6f3;color:#52696c;font-size:9px;text-transform:uppercase}footer{margin-top:20px;color:#829593;font-size:9px}@media print{tr{break-inside:avoid}}</style></head><body><header><h1>${escapeHtml(reportTitle)}</h1><div class="meta">Generated ${escapeHtml(generatedAt)} · Clinsight Clinical Intelligence</div></header>${includedSummary}${table}<footer>Confidential clinical report. Verify against the source record before clinical action.</footer><script>window.onload=()=>{window.focus();window.print()}</script></body></html>`);
    printWindow.document.close();
    setIsCustomReportOpen(false);
  }

  const reportCounts: Record<Exclude<ReportType, "clinical-overview">, number> = {
    "patient-summary": data.patients.length,
    "lab-results": data.labResults.length,
    medication: data.medications.length,
    "critical-alerts": alertsBySeverity[0].count,
  };

  return (
    <main className="reports-page">
      <header className="reports-heading">
        <div>
          <p className="reports-eyebrow">ANALYTICS <span>/</span> REPORTS</p>
          <h1>Clinical reports</h1>
          <p className="reports-subtitle">Review current care activity and export clinical data.</p>
        </div>
        <div className="reports-heading-actions">
          <button className="reports-icon-button" type="button" onClick={() => void loadReportData()} disabled={loading} aria-label="Refresh reports" title="Refresh reports"><RefreshCw size={15} className={loading ? "reports-spin" : ""} /></button>
          <button className="reports-primary" type="button" onClick={() => { setReportMessage(""); setIsCustomReportOpen(true); }} disabled={loading}><FileText size={15} /> Generate report</button>
        </div>
      </header>

      <section className="reports-summary" aria-label="Clinical report totals">
        {summary.map((item) => <SummaryItem key={item.label} icon={item.icon} label={item.label} value={item.value} critical={item.critical} />)}
      </section>

      <div className="reports-updated">{loadError ? <span className="reports-error-text">{loadError}</span> : loading ? "Loading report data..." : `Data refreshed ${lastUpdated ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(lastUpdated)) : ""}`} {loadError && <button type="button" onClick={() => void loadReportData()}>Retry</button>}</div>

      {loading && data.patients.length === 0 ? <div className="reports-loading" role="status"><span /><span /><span /><span /></div> : loadError ? null : (
        <>
          <section className="reports-chart-grid">
            <article className="reports-panel reports-status-panel">
              <PanelHeading title="Patient status" detail="Current patient distribution" />
              <div className="reports-status-chart">
                {data.patients.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>{statusData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 3, fontSize: 11 }} /></PieChart></ResponsiveContainer> : <ChartEmpty message="No patient records" />}
              </div>
              <div className="reports-legend">{statusData.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.value}</b><small>{data.patients.length ? `${Math.round(item.value / data.patients.length * 100)}%` : "0%"}</small></div>)}</div>
            </article>

            <article className="reports-panel reports-diagnosis-panel">
              <PanelHeading title="Common diagnoses" detail="Most frequent diagnoses in patient records" />
              <div className="reports-diagnosis-chart">
                {diagnosisData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={diagnosisData} layout="vertical" margin={{ top: 2, right: 12, left: 0, bottom: 2 }}><CartesianGrid vertical={false} stroke="#e8efec" /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 9 }} allowDecimals={false} /><YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: "#52696c", fontSize: 9 }} width={125} /><Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 3, fontSize: 11 }} /><Bar dataKey="count" fill="#147d70" radius={[0, 2, 2, 0]} maxBarSize={16} /></BarChart></ResponsiveContainer> : <ChartEmpty message="No diagnosis data" />}
              </div>
            </article>
          </section>

          <section className="reports-chart-grid reports-chart-grid-secondary">
            <article className="reports-panel">
              <PanelHeading title="Alerts by severity" detail="Clinical alerts currently recorded" />
              <div className="reports-alert-chart">
                {data.alerts.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={alertsBySeverity} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8efec" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 9 }} allowDecimals={false} /><Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 3, fontSize: 11 }} /><Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={44}>{alertsBySeverity.map((item) => <Cell key={item.name} fill={item.fill} />)}</Bar></BarChart></ResponsiveContainer> : <ChartEmpty message="No alert records" />}
              </div>
            </article>

            <article className="reports-panel">
              <PanelHeading title="Clinical activity" detail="Visits and lab results over the last six months" />
              <div className="reports-activity-chart">
                {data.visits.length + data.labResults.length > 0 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyActivity} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8efec" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 9 }} allowDecimals={false} /><Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 3, fontSize: 11 }} /><Line type="monotone" dataKey="visits" name="Visits" stroke="#147d70" strokeWidth={2} dot={{ r: 2 }} /><Line type="monotone" dataKey="labs" name="Lab results" stroke="#a57a38" strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer> : <ChartEmpty message="No activity data" />}
              </div>
              <div className="reports-chart-key"><span><i className="is-visits" />Visits</span><span><i className="is-labs" />Lab results</span></div>
            </article>
          </section>

          <section className="reports-panel reports-catalog">
            <div className="reports-catalog-heading"><PanelHeading title="Available reports" detail="Export the latest records from the clinical database" /><span>{lastUpdated ? `Updated ${formatDate(lastUpdated)}` : "Live data"}</span></div>
            <div className="reports-catalog-list">
              {REPORT_CATALOG.map((report) => {
                const Icon = report.icon;
                return <article className="reports-catalog-row" key={report.id}>
                  <span className="reports-catalog-icon"><Icon size={16} /></span>
                  <div className="reports-catalog-copy"><h3>{report.title}</h3><p>{report.detail}</p></div>
                  <span className="reports-catalog-count">{reportCounts[report.id]} records</span>
                  <button className="reports-download" type="button" onClick={() => downloadCsv(report.id, report.title)} disabled={loading}><Download size={14} /> CSV</button>
                </article>;
              })}
            </div>
          </section>
        </>
      )}

      <Dialog open={isCustomReportOpen} onOpenChange={setIsCustomReportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Generate a report</DialogTitle><DialogDescription>Choose a dataset and print it or save as PDF.</DialogDescription></DialogHeader>
          <div className="reports-form">
            <label>Report title<input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} maxLength={100} placeholder="Clinical overview" /></label>
            <label>Dataset<select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}><option value="clinical-overview">Clinical overview</option><option value="patient-summary">Patient summary</option><option value="lab-results">Lab results</option><option value="medication">Medication report</option><option value="critical-alerts">Critical alerts</option></select></label>
            <label className="reports-checkbox"><input type="checkbox" checked={includeSummary} onChange={(event) => setIncludeSummary(event.target.checked)} /> Include current dataset totals</label>
            {reportMessage && <p role="alert">{reportMessage}</p>}
          </div>
          <DialogFooter><button className="reports-secondary" type="button" onClick={() => setIsCustomReportOpen(false)}>Cancel</button><button className="reports-primary" type="button" onClick={generatePrintableReport} disabled={!reportTitle.trim() || loading}><Download size={14} /> Print / Save PDF</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .reports-page { --reports-ink:#15313a; --reports-muted:#718487; --reports-line:#dbe6e3; --reports-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 38px; color:var(--reports-ink); }
        .reports-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:23px; }.reports-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.reports-eyebrow span { padding:0 5px; color:#a4b3b0; }.reports-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.reports-subtitle { margin:8px 0 0; color:var(--reports-muted); font-size:12px; }.reports-heading-actions { display:flex; align-items:center; gap:7px; }
        .reports-primary,.reports-secondary,.reports-icon-button,.reports-download { display:inline-flex; min-height:36px; align-items:center; justify-content:center; gap:7px; padding:0 11px; border:1px solid var(--reports-line); border-radius:3px; color:#52696c; background:#fff; font:inherit; font-size:10px; text-decoration:none; white-space:nowrap; cursor:pointer; }.reports-primary { border-color:var(--reports-green) !important; color:#fff !important; background:var(--reports-green) !important; font-weight:650; }.reports-primary:hover:not(:disabled) { color:#fff !important; background:#0d655b !important; }.reports-secondary:hover,.reports-icon-button:hover,.reports-download:hover { border-color:#9fbab1; color:var(--reports-green); background:#f7fbf9; }.reports-primary:disabled,.reports-icon-button:disabled,.reports-download:disabled { opacity:.55; cursor:wait; }.reports-icon-button { width:36px; padding:0; }.reports-spin { animation:reports-spin 1s linear infinite; }@keyframes reports-spin { to { transform:rotate(360deg); } }
        .reports-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:10px; border:1px solid var(--reports-line); background:#fff; }.reports-summary-item { display:flex; min-height:78px; align-items:center; gap:12px; padding:14px 17px; }.reports-summary-item + .reports-summary-item { border-left:1px solid var(--reports-line); }.reports-summary-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--reports-green); background:#eaf4f0; }.reports-summary-item.is-critical .reports-summary-icon { color:#a84936; background:#fbefeb; }.reports-summary-value { display:block; font:400 22px/1 Georgia,serif; }.reports-summary-label { display:block; margin-top:5px; color:#718487; font-size:10px; }
        .reports-updated { display:flex; align-items:center; justify-content:flex-end; gap:10px; min-height:25px; margin-bottom:8px; color:#8a9b99; font-size:9px; }.reports-updated button { border:0; color:var(--reports-green); background:transparent; font:inherit; font-weight:650; text-decoration:underline; cursor:pointer; }.reports-error-text { color:#a84936; }.reports-loading { display:grid; padding:5px 0; }.reports-loading span { height:54px; border-bottom:1px solid #edf2f0; background:linear-gradient(90deg,#fff 25%,#f2f7f4 40%,#fff 65%); background-size:350% 100%; animation:reports-shimmer 1.4s ease infinite; }@keyframes reports-shimmer { to { background-position:-100% 0; } }
        .reports-chart-grid { display:grid; grid-template-columns:minmax(280px,.8fr) minmax(0,1.4fr); gap:14px; margin-bottom:14px; }.reports-chart-grid-secondary { grid-template-columns:repeat(2,minmax(0,1fr)); }.reports-panel { min-width:0; border:1px solid var(--reports-line); background:#fff; padding:17px 18px; }.reports-panel-heading h2 { margin:0; color:#29464a; font-size:12px; font-weight:700; }.reports-panel-heading p { margin:5px 0 0; color:#829593; font-size:10px; }.reports-status-chart { height:165px; margin-top:7px; }.reports-legend { display:grid; gap:8px; padding-top:12px; border-top:1px solid #edf2f0; }.reports-legend > div { display:flex; align-items:center; gap:8px; }.reports-legend i { width:8px; height:8px; flex:0 0 8px; }.reports-legend span { flex:1; color:#52696c; font-size:10px; }.reports-legend b { color:#29464a; font-size:10px; }.reports-legend small { width:32px; color:#8a9b99; font-size:9px; text-align:right; }.reports-diagnosis-chart { height:255px; margin-top:10px; }.reports-alert-chart,.reports-activity-chart { height:195px; margin-top:12px; }.reports-chart-key { display:flex; gap:14px; margin-top:4px; }.reports-chart-key span { display:flex; align-items:center; gap:5px; color:#829593; font-size:9px; }.reports-chart-key i { width:8px; height:8px; }.reports-chart-key .is-visits { background:#147d70; }.reports-chart-key .is-labs { background:#a57a38; }.reports-chart-empty { display:grid; height:100%; place-items:center; color:#829593; font-size:10px; }
        .reports-catalog { padding:17px 18px 4px; }.reports-catalog-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }.reports-catalog-heading > span { color:#8a9b99; font-size:9px; }.reports-catalog-list { display:grid; }.reports-catalog-row { display:flex; min-width:0; align-items:center; gap:11px; padding:11px 2px; border-top:1px solid #edf2f0; }.reports-catalog-icon { display:grid; width:31px; height:31px; flex:0 0 31px; place-items:center; color:var(--reports-green); background:#eaf4f0; }.reports-catalog-copy { min-width:0; flex:1; }.reports-catalog-copy h3 { margin:0; color:#29464a; font-size:10px; font-weight:650; }.reports-catalog-copy p { margin:4px 0 0; color:#829593; font-size:9px; }.reports-catalog-count { color:#8a9b99; font-size:9px; white-space:nowrap; }.reports-download { min-height:30px; padding:0 8px; font-size:9px; }
        .reports-form { display:grid; gap:12px; padding:8px 0; }.reports-form label { display:grid; gap:6px; color:#52696c; font-size:10px; font-weight:650; }.reports-form input:not([type="checkbox"]),.reports-form select { width:100%; height:36px; padding:0 9px; border:1px solid var(--reports-line); border-radius:2px; color:#29464a; background:#fff; font:inherit; font-size:11px; }.reports-form .reports-checkbox { display:flex; align-items:center; gap:8px; font-weight:400; }.reports-form > p { margin:0; color:#a84936; font-size:10px; }
        @media (max-width:760px) { .reports-heading { align-items:flex-start; }.reports-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.reports-summary-item:nth-child(3) { border-left:0; border-top:1px solid var(--reports-line); }.reports-summary-item:nth-child(4) { border-top:1px solid var(--reports-line); }.reports-chart-grid { grid-template-columns:1fr; }.reports-chart-grid-secondary { grid-template-columns:1fr; } }
        @media (max-width:480px) { .reports-page { padding-top:0; }.reports-heading { flex-direction:column; align-items:stretch; }.reports-heading h1 { font-size:28px; }.reports-heading-actions { align-self:flex-start; }.reports-summary-item { min-height:72px; padding:12px; }.reports-summary-value { font-size:20px; }.reports-catalog-row { flex-wrap:wrap; }.reports-catalog-copy { flex-basis:calc(100% - 45px); }.reports-catalog-count { margin-left:42px; }.reports-catalog-heading { flex-direction:column; }.reports-chart-grid .reports-panel { padding:14px; } }
      `}</style>
    </main>
  );
}

function SummaryItem({ icon, label, value, critical }: { icon: React.ReactNode; label: string; value: number; critical?: boolean }) {
  return <div className={`reports-summary-item${critical ? " is-critical" : ""}`}><span className="reports-summary-icon">{icon}</span><span><b className="reports-summary-value">{value}</b><small className="reports-summary-label">{label}</small></span></div>;
}

function PanelHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="reports-panel-heading"><h2>{title}</h2><p>{detail}</p></div>;
}

function ChartEmpty({ message }: { message: string }) {
  return <div className="reports-chart-empty">{message}</div>;
}