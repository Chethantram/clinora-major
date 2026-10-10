"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  BrainCircuit,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  HeartPulse,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchApi } from "@/lib/backend-api";
import LandingPage from "@/components/landing-page";

type Patient = {
  patient_id: string;
  name: string;
  age?: number | null;
  gender?: string;
  diagnosis?: string[];
  status?: string;
  lastVisit?: string | null;
};

type Visit = {
  patient_id: string;
  date: string | null;
  doctor?: string;
  department?: string;
  visit_type?: string;
};

type LabResult = {
  patient_id: string;
  test: string;
  value: number | null;
  unit?: string;
  date: string | null;
  status?: string;
};

type ClinicalAlert = {
  id: string;
  patient_id: string;
  severity: string;
  message: string;
  timestamp: string | null;
};

type DashboardData = {
  patients: Patient[];
  visits: Visit[];
  medications: unknown[];
  labResults: LabResult[];
  alerts: ClinicalAlert[];
};

const EMPTY_DASHBOARD: DashboardData = {
  patients: [],
  visits: [],
  medications: [],
  labResults: [],
  alerts: [],
};

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined) {
  const date = safeDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function severityClass(value: string) {
  const severity = value.toLowerCase();
  if (severity.includes("critical") || severity.includes("high")) return "severity-high";
  if (severity.includes("medium") || severity.includes("monitor") || severity.includes("borderline")) return "severity-medium";
  return "severity-low";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await fetchApi<DashboardData>("/api/dashboard/data");
      setData({
        patients: Array.isArray(dashboard.patients) ? dashboard.patients : [],
        visits: Array.isArray(dashboard.visits) ? dashboard.visits : [],
        medications: Array.isArray(dashboard.medications) ? dashboard.medications : [],
        labResults: Array.isArray(dashboard.labResults) ? dashboard.labResults : [],
        alerts: Array.isArray(dashboard.alerts) ? dashboard.alerts : [],
      });
    } catch {
      setError("Dashboard data could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchApi<{ authenticated: boolean; user: { name?: string } }>("/api/auth/session")
      .then((session) => {
        if (!active) return;
        if (session.user?.name) setDoctorName(session.user.name.replace(/^Dr\.?\s*/i, ""));
        setAuthenticated(true);
        void loadDashboard();
      })
      .catch(() => {
        if (!active) return;
        setAuthenticated(false);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  const patientById = new Map(data.patients.map((patient) => [patient.patient_id, patient]));
  const recentVisits = [...data.visits]
    .filter((visit) => safeDate(visit.date))
    .sort((first, second) => (safeDate(second.date)?.getTime() || 0) - (safeDate(first.date)?.getTime() || 0))
    .slice(0, 6);
  const recentPatients = [...data.patients]
    .sort((first, second) => (safeDate(second.lastVisit)?.getTime() || 0) - (safeDate(first.lastVisit)?.getTime() || 0))
    .slice(0, 5);
  const activeAlerts = [...data.alerts]
    .sort((first, second) => (safeDate(second.timestamp)?.getTime() || 0) - (safeDate(first.timestamp)?.getTime() || 0))
    .slice(0, 5);
  const criticalAlerts = data.alerts.filter((alert) => severityClass(alert.severity) === "severity-high").length;
  const abnormalLabs = data.labResults.filter((lab) => severityClass(lab.status || "") !== "severity-low").length;
  const weekActivity = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - offset));
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const visits = data.visits.filter((visit) => {
      const date = safeDate(visit.date);
      return date && date >= day && date < nextDay;
    });
    return {
      day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(day),
      consultations: visits.length,
      patients: new Set(visits.map((visit) => visit.patient_id)).size,
    };
  });
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (authenticated === false) return <LandingPage />;
  if (authenticated === null) return <div className="overview-loading" role="status">Checking your secure session...</div>;

  return (
    <main className="overview">
      <header className="overview-heading">
        <div>
          <p className="overview-kicker">CLINICAL OVERVIEW <span>{new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}</span></p>
          <h1>{greeting}, Dr. {doctorName}</h1>
          <p className="overview-subtitle">Here is the latest across your patient workspace.</p>
        </div>
        <div className="overview-actions">
          <button className="overview-icon-button" type="button" onClick={() => void loadDashboard()} title="Refresh dashboard" aria-label="Refresh dashboard" disabled={loading}>
            <RefreshCw size={16} className={loading ? "overview-spin" : ""} />
          </button>
          <Link className="overview-primary-button" href="/assistant"><BrainCircuit size={16} /> Open clinical assistant</Link>
        </div>
      </header>

      {error && <div className="overview-error" role="alert"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={() => void loadDashboard()}>Retry</button></div>}

      <section className="overview-metrics" aria-label="Practice summary">
        <Metric icon={<Users size={18} />} label="Patients" value={data.patients.length} detail="In your workspace" loading={loading} />
        <Metric icon={<CalendarDays size={18} />} label="Visits" value={data.visits.length} detail="Recorded consultations" loading={loading} />
        <Metric icon={<Activity size={18} />} label="Lab signals" value={abnormalLabs} detail="Results needing review" loading={loading} />
        <Metric icon={<Bell size={18} />} label="Priority alerts" value={criticalAlerts} detail="High or critical" loading={loading} critical />
      </section>

      <section className="overview-main-grid">
        <article className="overview-panel overview-activity">
          <div className="overview-panel-heading">
            <div><h2>Consultation activity</h2><p>Visits recorded over the last seven days</p></div>
            <span className="overview-period">LAST 7 DAYS</span>
          </div>
          {loading ? <div className="overview-chart-placeholder" aria-label="Loading activity" /> : (
            <div className="overview-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekActivity} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs><linearGradient id="visit-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#147d70" stopOpacity={0.2} /><stop offset="100%" stopColor="#147d70" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#e8efec" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 11 }} dy={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 11 }} />
                  <Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 4, boxShadow: "0 8px 24px rgba(21,49,58,.08)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="consultations" name="Visits" stroke="#147d70" strokeWidth={2} fill="url(#visit-fill)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="overview-chart-foot"><span><i /> Visits</span><span>{data.visits.length} total records</span></div>
        </article>

        <article className="overview-panel overview-alerts-panel">
          <div className="overview-panel-heading">
            <div><h2>Priority alerts</h2><p>Clinical signals for review</p></div>
            <Link className="overview-view-link" href="/alerts" aria-label="View all alerts"><ArrowRight size={16} /></Link>
          </div>
          {loading ? <ListPlaceholder /> : activeAlerts.length === 0 ? <EmptyNotice icon={<HeartPulse size={20} />} title="No alerts to review" detail="New patient signals will appear here." /> : (
            <ul className="overview-alert-list">
              {activeAlerts.map((alert) => (
                <li key={alert.id}>
                  <span className={`overview-severity ${severityClass(alert.severity)}`} />
                  <div><p>{alert.message}</p><small>{patientById.get(alert.patient_id)?.name || alert.patient_id} <span>·</span> {formatDate(alert.timestamp)}</small></div>
                  <span className={`overview-severity-label ${severityClass(alert.severity)}`}>{alert.severity}</span>
                </li>
              ))}
            </ul>
          )}
          <Link className="overview-panel-footer" href="/alerts">Review alerts <ArrowRight size={14} /></Link>
        </article>
      </section>

      <section className="overview-lower-grid">
        <article className="overview-panel overview-patients-panel">
          <div className="overview-panel-heading">
            <div><h2>Recent patients</h2><p>Patients with the latest recorded activity</p></div>
            <Link className="overview-view-link" href="/patients" aria-label="View all patients"><ArrowRight size={16} /></Link>
          </div>
          {loading ? <ListPlaceholder /> : recentPatients.length === 0 ? <EmptyNotice icon={<Users size={20} />} title="No patients yet" detail="Patients added to your workspace will appear here." /> : (
            <div className="overview-patient-table-wrap">
              <table className="overview-patient-table">
                <thead><tr><th>Patient</th><th>Last visit</th><th>Care status</th><th /></tr></thead>
                <tbody>{recentPatients.map((patient) => (
                  <tr key={patient.patient_id}>
                    <td><Link href={`/patients/${encodeURIComponent(patient.patient_id)}`}><span className="overview-avatar">{patient.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><span><b>{patient.name}</b><small>{patient.patient_id}{patient.age ? ` · ${patient.age} years` : ""}</small></span></Link></td>
                    <td>{formatDate(patient.lastVisit)}</td>
                    <td><span className={`overview-status ${severityClass(patient.status || "stable")}`}>{patient.status || "Stable"}</span></td>
                    <td><Link href={`/patients/${encodeURIComponent(patient.patient_id)}`} aria-label={`Open ${patient.name}`}><ArrowRight size={15} /></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <Link className="overview-panel-footer" href="/patients">Open patient directory <ArrowRight size={14} /></Link>
        </article>

        <article className="overview-panel overview-visits-panel">
          <div className="overview-panel-heading">
            <div><h2>Recent visits</h2><p>Latest recorded consultations</p></div>
            <ClipboardList size={17} className="overview-muted-icon" />
          </div>
          {loading ? <ListPlaceholder /> : recentVisits.length === 0 ? <EmptyNotice icon={<CalendarDays size={20} />} title="No visits recorded" detail="Visit history will appear as care is documented." /> : (
            <ul className="overview-visit-list">
              {recentVisits.map((visit, index) => (
                <li key={`${visit.patient_id}-${visit.date}-${index}`}>
                  <span className="overview-visit-date">{formatDate(visit.date)}</span>
                  <div><b>{patientById.get(visit.patient_id)?.name || visit.patient_id}</b><small>{visit.visit_type || visit.department || "Consultation"}</small></div>
                  <Link href={`/patients/${encodeURIComponent(visit.patient_id)}`} aria-label={`Open visit for ${visit.patient_id}`}><ArrowRight size={14} /></Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <style jsx global>{`
        .overview { --overview-ink:#15313a; --overview-muted:#718487; --overview-line:#dbe6e3; --overview-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 36px; color:var(--overview-ink); }
        .overview-loading { display:grid; min-height:55vh; place-items:center; color:#718487; font-size:13px; }
        .overview-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:22px; margin-bottom:25px; }
        .overview-kicker { display:flex; align-items:center; gap:12px; margin:0 0 10px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }
        .overview-kicker span { color:#8a9b99; font-size:10px; font-weight:500; letter-spacing:0; }
        .overview-heading h1 { margin:0; font:400 32px/1.15 Georgia,serif; }
        .overview-subtitle { margin:8px 0 0; color:var(--overview-muted); font-size:12px; }
        .overview-actions { display:flex; align-items:center; gap:9px; }
        .overview-icon-button,.overview-primary-button { display:inline-flex; height:38px; align-items:center; justify-content:center; gap:8px; border:1px solid var(--overview-line); border-radius:4px; color:#52696c; background:white; cursor:pointer; text-decoration:none; }
        .overview-icon-button { width:38px; }.overview-icon-button:disabled { cursor:wait; opacity:.65; }
        .overview-primary-button { padding:0 13px; border-color:var(--overview-green); color:#fff; background:var(--overview-green); font-size:11px; font-weight:650; }.overview-primary-button:hover { background:#0d655b; }
        .overview-spin { animation:overview-spin 1.2s linear infinite; } @keyframes overview-spin { to { transform:rotate(360deg); } }
        .overview-error { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:11px 13px; border:1px solid #efd1c8; color:#a84936; background:#fff5f1; font-size:12px; }.overview-error span { flex:1; }.overview-error button { border:0; color:#a84936; background:none; text-decoration:underline; cursor:pointer; }
        .overview-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--overview-line); background:#fff; }
        .overview-metric { display:flex; min-height:116px; align-items:flex-start; justify-content:space-between; padding:18px 20px; }.overview-metric + .overview-metric { border-left:1px solid var(--overview-line); }
        .overview-metric-label { color:#718487; font-size:11px; }.overview-metric-value { margin-top:10px; font:400 28px/1 Georgia,serif; }.overview-metric-detail { display:block; margin-top:7px; color:#8a9b99; font-size:10px; }
        .overview-metric-icon { display:grid; place-items:center; width:34px; height:34px; color:var(--overview-green); background:#eaf4f0; }.overview-metric.critical .overview-metric-icon { color:#bd654d; background:#fbefeb; }.overview-metric.critical .overview-metric-value { color:#a84936; }
        .overview-main-grid { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(330px,1fr); gap:14px; margin-top:14px; }
        .overview-lower-grid { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(320px,1fr); gap:14px; margin-top:14px; }
        .overview-panel { min-width:0; padding:19px 20px 0; border:1px solid var(--overview-line); background:#fff; }
        .overview-panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }.overview-panel-heading h2 { margin:0; font-size:13px; font-weight:700; }.overview-panel-heading p { margin:5px 0 0; color:#8a9b99; font-size:10px; }
        .overview-period { padding:5px 7px; color:#718487; background:#f3f7f5; font-size:8px; font-weight:700; letter-spacing:.7px; white-space:nowrap; }
        .overview-chart { height:225px; margin:15px -8px 0; }.overview-chart-placeholder { height:225px; margin-top:15px; background:linear-gradient(90deg,#f5f8f7 25%,#eaf1ee 37%,#f5f8f7 63%); background-size:400% 100%; animation:overview-shimmer 1.5s ease infinite; } @keyframes overview-shimmer { to { background-position:-100% 0; } }
        .overview-chart-foot { display:flex; justify-content:space-between; padding:11px 0 13px; border-top:1px solid #edf2f0; color:#8a9b99; font-size:10px; }.overview-chart-foot span:first-child { display:flex; align-items:center; gap:7px; color:#52696c; }.overview-chart-foot i { width:7px; height:7px; border-radius:50%; background:#147d70; }
        .overview-view-link { display:grid; width:29px; height:29px; place-items:center; border:1px solid var(--overview-line); color:#58716f; text-decoration:none; }.overview-view-link:hover { border-color:#147d70; color:#147d70; }.overview-muted-icon { color:#7b9290; }
        .overview-alert-list,.overview-visit-list { margin:13px 0 0; padding:0; list-style:none; }.overview-alert-list li { display:flex; align-items:flex-start; gap:9px; padding:11px 0; border-top:1px solid #edf2f0; }.overview-alert-list li > div { flex:1; min-width:0; }.overview-alert-list li p { margin:0; font-size:10px; font-weight:600; line-height:1.45; }.overview-alert-list li small { display:block; margin-top:4px; color:#8a9b99; font-size:9px; }.overview-alert-list li small span { padding:0 3px; }
        .overview-severity { flex:0 0 7px; width:7px; height:7px; margin-top:3px; border-radius:50%; }.severity-high { color:#a84936; background-color:#f9e8e2; }.overview-severity.severity-high { background:#c86e56; }.severity-medium { color:#916b2c; background-color:#f7f0df; }.overview-severity.severity-medium { background:#c79b4a; }.severity-low { color:#537a6c; background-color:#e8f1ed; }.overview-severity.severity-low { background:#78a18e; }
        .overview-severity-label { padding:3px 5px; font-size:8px; font-weight:700; text-transform:uppercase; white-space:nowrap; }
        .overview-panel-footer { display:flex; min-height:40px; align-items:center; justify-content:center; gap:6px; margin-top:5px; border-top:1px solid #edf2f0; color:#58716f; text-decoration:none; font-size:10px; font-weight:650; }.overview-panel-footer:hover { color:#147d70; }
        .overview-patient-table-wrap { overflow-x:auto; }.overview-patient-table { width:100%; margin-top:15px; border-collapse:collapse; text-align:left; }.overview-patient-table th { padding:8px 7px; border-bottom:1px solid var(--overview-line); color:#8a9b99; font-size:8px; font-weight:650; text-transform:uppercase; letter-spacing:.5px; }.overview-patient-table td { padding:10px 7px; border-bottom:1px solid #edf2f0; color:#718487; font-size:10px; white-space:nowrap; }.overview-patient-table tbody tr:last-child td { border-bottom:0; }.overview-patient-table td:first-child a { display:flex; align-items:center; gap:9px; color:inherit; text-decoration:none; }.overview-avatar { display:grid; flex:0 0 29px; width:29px; height:29px; place-items:center; color:#147d70; background:#eaf4f0; font-size:9px; font-weight:700; }.overview-patient-table td b { display:block; color:#15313a; font-size:10px; font-weight:650; }.overview-patient-table td small { display:block; margin-top:3px; color:#8a9b99; font-size:9px; }.overview-patient-table td:last-child a { color:#8a9b99; }
        .overview-status { padding:4px 6px; font-size:8px; font-weight:650; text-transform:capitalize; }.overview-visit-list li { display:grid; grid-template-columns:68px minmax(0,1fr) 20px; align-items:center; gap:9px; padding:10px 0; border-top:1px solid #edf2f0; }.overview-visit-date { color:#829593; font-size:9px; white-space:nowrap; }.overview-visit-list b { display:block; overflow:hidden; color:#15313a; font-size:10px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }.overview-visit-list small { display:block; margin-top:3px; overflow:hidden; color:#8a9b99; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }.overview-visit-list a { color:#8a9b99; }
        .overview-empty { display:grid; min-height:165px; align-content:center; justify-items:center; padding:22px; text-align:center; }.overview-empty-icon { display:grid; width:37px; height:37px; place-items:center; color:#147d70; background:#eaf4f0; }.overview-empty b { margin-top:10px; font-size:11px; }.overview-empty p { margin:5px 0 0; color:#8a9b99; font-size:10px; }
        .overview-placeholder { display:grid; gap:15px; margin-top:18px; }.overview-placeholder i { display:block; height:29px; background:#f2f6f4; }
        @media (max-width:1050px) { .overview-main-grid,.overview-lower-grid { grid-template-columns:1fr; }.overview-alerts-panel { min-height:250px; } }
        @media (max-width:760px) { .overview { padding-top:0; }.overview-heading { align-items:flex-start; flex-direction:column; }.overview-heading h1 { font-size:28px; }.overview-actions { align-self:stretch; justify-content:flex-end; }.overview-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }.overview-metric:nth-child(3) { border-left:0; border-top:1px solid var(--overview-line); }.overview-metric:nth-child(4) { border-top:1px solid var(--overview-line); }.overview-panel { padding-right:14px; padding-left:14px; } }
        @media (max-width:420px) { .overview-kicker { flex-wrap:wrap; }.overview-kicker span { width:100%; }.overview-metric { min-height:105px; padding:14px 12px; }.overview-metric-value { font-size:25px; }.overview-primary-button { padding:0 9px; font-size:10px; }.overview-patient-table th:nth-child(2),.overview-patient-table td:nth-child(2) { display:none; } }
      `}</style>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  loading,
  critical = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  loading: boolean;
  critical?: boolean;
}) {
  return (
    <article className={`overview-metric ${critical ? "critical" : ""}`}>
      <div><span className="overview-metric-label">{label}</span><p className="overview-metric-value">{loading ? "--" : value.toLocaleString()}</p><small className="overview-metric-detail">{detail}</small></div>
      <span className="overview-metric-icon">{icon}</span>
    </article>
  );
}

function EmptyNotice({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="overview-empty"><span className="overview-empty-icon">{icon}</span><b>{title}</b><p>{detail}</p></div>;
}

function ListPlaceholder() {
  return <div className="overview-placeholder" aria-label="Loading records"><i /><i /><i /></div>;
}
