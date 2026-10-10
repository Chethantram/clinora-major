"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  Clock3,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { fetchApi } from "@/lib/backend-api";

type AlertSeverity = "high" | "medium" | "low";
type SeverityFilter = "all" | AlertSeverity;
type AlertType = "critical_value" | "drug_interaction" | "test_overdue" | "pattern";
type AlertTypeFilter = "all" | AlertType;

interface ClinicalAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  timestamp: string | null;
  evidence?: string;
  recommendation?: string;
}

const severityDetails: Record<AlertSeverity, { label: string; icon: typeof AlertTriangle }> = {
  high: { label: "Critical", icon: AlertTriangle },
  medium: { label: "Moderate", icon: Activity },
  low: { label: "Low risk", icon: ShieldCheck },
};

const typeLabels: Record<AlertType, string> = {
  critical_value: "Critical value",
  drug_interaction: "Drug interaction",
  test_overdue: "Test overdue",
  pattern: "Pattern detected",
};

function formatTimestamp(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>("all");
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchApi<ClinicalAlert[]>("/api/alerts");
      setAlerts(Array.isArray(rows) ? rows : []);
    } catch {
      setLoadError("Clinical alerts could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const counts = useMemo(() => ({
    all: alerts.length,
    high: alerts.filter((alert) => alert.severity === "high").length,
    medium: alerts.filter((alert) => alert.severity === "medium").length,
    low: alerts.filter((alert) => alert.severity === "low").length,
  }), [alerts]);

  const filteredAlerts = useMemo(() => alerts.filter((alert) => (
    (severityFilter === "all" || alert.severity === severityFilter)
    && (typeFilter === "all" || alert.type === typeFilter)
  )), [alerts, severityFilter, typeFilter]);

  const displayedAlerts = showHistory ? filteredAlerts : filteredAlerts.slice(0, 10);
  const hasFilters = severityFilter !== "all" || typeFilter !== "all";

  return (
    <main className="alerts-page">
      <header className="alerts-heading">
        <div>
          <p className="alerts-eyebrow">CARE MONITORING <span>/</span> ALERTS</p>
          <h1>Clinical alerts</h1>
          <p className="alerts-subtitle">Review patient signals and follow-up recommendations.</p>
        </div>
        <button className="alerts-refresh" type="button" onClick={() => void loadAlerts()} disabled={loading} aria-label="Refresh alerts">
          <RefreshCw size={15} className={loading ? "alerts-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="alerts-summary" aria-label="Alert severity summary">
        <SummaryButton label="All alerts" value={counts.all} selected={severityFilter === "all"} onClick={() => setSeverityFilter("all")} icon={<Bell size={17} />} />
        <SummaryButton label="Critical" value={counts.high} selected={severityFilter === "high"} tone="critical" onClick={() => setSeverityFilter("high")} icon={<AlertTriangle size={17} />} />
        <SummaryButton label="Moderate" value={counts.medium} selected={severityFilter === "medium"} tone="moderate" onClick={() => setSeverityFilter("medium")} icon={<Activity size={17} />} />
        <SummaryButton label="Low risk" value={counts.low} selected={severityFilter === "low"} tone="low" onClick={() => setSeverityFilter("low")} icon={<ShieldCheck size={17} />} />
      </section>

      <section className="alerts-directory" aria-label="Clinical alert records">
        <div className="alerts-toolbar">
          <div className="alerts-filter-title"><SlidersHorizontal size={15} /><span>Filter alerts</span></div>
          <label className="alerts-filter-label" htmlFor="alert-type-filter">Type</label>
          <select id="alert-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as AlertTypeFilter)}>
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
          <span className="alerts-result-count">
            {loading ? "Loading alerts" : `${displayedAlerts.length} of ${filteredAlerts.length} alerts`}
          </span>
          <button className="alerts-history-toggle" type="button" onClick={() => setShowHistory((current) => !current)}>
            {showHistory ? "Show latest" : "View all"}
          </button>
          {hasFilters && (
            <button className="alerts-clear" type="button" onClick={() => { setSeverityFilter("all"); setTypeFilter("all"); }}>
              <X size={13} /> Clear filters
            </button>
          )}
        </div>

        {loadError && (
          <div className="alerts-error" role="alert">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadAlerts()}>Retry</button>
          </div>
        )}

        {loading && alerts.length === 0 ? (
          <div className="alerts-loading" role="status" aria-label="Loading alerts"><span /><span /><span /><span /></div>
        ) : loadError ? null : displayedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <span><Bell size={19} /></span>
            <h2>{alerts.length === 0 ? "No clinical alerts" : "No alerts match these filters"}</h2>
            <p>{alerts.length === 0 ? "New patient signals will appear here when available." : "Try a different severity or alert type."}</p>
            {hasFilters && <button type="button" onClick={() => { setSeverityFilter("all"); setTypeFilter("all"); }}>Clear filters</button>}
          </div>
        ) : (
          <div className="alerts-list">
            {displayedAlerts.map((alert) => {
              const severity = severityDetails[alert.severity] || severityDetails.low;
              const typeLabel = typeLabels[alert.type] || typeLabels.pattern;
              const Icon = severity.icon;
              return (
                <article key={alert.id} className={`alerts-row severity-${alert.severity}`}>
                  <span className="alerts-row-icon"><Icon size={16} /></span>
                  <div className="alerts-row-content">
                    <div className="alerts-row-heading">
                      <h2>{alert.message}</h2>
                      <span className="alerts-type">{typeLabel}</span>
                    </div>
                    {alert.evidence && <p className="alerts-detail"><b>Evidence</b> {alert.evidence}</p>}
                    {alert.recommendation && <p className="alerts-detail"><b>Recommended follow-up</b> {alert.recommendation}</p>}
                    <div className="alerts-row-meta">
                      {alert.patient_id ? (
                        <Link href={`/patients/${encodeURIComponent(alert.patient_id)}`} className="alerts-patient-link">
                          {alert.patient_name || alert.patient_id}
                        </Link>
                      ) : <span className="alerts-patient-name">{alert.patient_name || "Patient unavailable"}</span>}
                      <span className="alerts-severity-label">{severity.label}</span>
                      <span className="alerts-date"><Clock3 size={12} /> {formatTimestamp(alert.timestamp)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx global>{`
        .alerts-page { --alerts-ink:#15313a; --alerts-muted:#718487; --alerts-line:#dbe6e3; --alerts-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 38px; color:var(--alerts-ink); }
        .alerts-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:23px; }
        .alerts-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.alerts-eyebrow span { padding:0 5px; color:#a4b3b0; }
        .alerts-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.alerts-subtitle { margin:8px 0 0; color:var(--alerts-muted); font-size:12px; }
        .alerts-refresh,.alerts-history-toggle,.alerts-clear { display:inline-flex; min-height:36px; align-items:center; justify-content:center; gap:7px; padding:0 11px; border:1px solid var(--alerts-line); border-radius:3px; color:#52696c; background:#fff; font:inherit; font-size:10px; text-decoration:none; white-space:nowrap; cursor:pointer; }.alerts-refresh:hover,.alerts-history-toggle:hover,.alerts-clear:hover { border-color:#9fbab1; color:var(--alerts-green); background:#f7fbf9; }.alerts-refresh:disabled { opacity:.6; cursor:wait; }.alerts-spin { animation:alerts-rotate 1s linear infinite; }@keyframes alerts-rotate { to { transform:rotate(360deg); } }
        .alerts-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:14px; border:1px solid var(--alerts-line); background:#fff; }
        .alerts-summary-item { display:flex; width:100%; min-height:78px; align-items:center; gap:12px; padding:14px 17px; border:0; background:#fff; text-align:left; cursor:pointer; }.alerts-summary-item + .alerts-summary-item { border-left:1px solid var(--alerts-line); }.alerts-summary-item:hover,.alerts-summary-item.selected { background:#f7fbf9; }.alerts-summary-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--alerts-green); background:#eaf4f0; }.alerts-summary-item.tone-critical .alerts-summary-icon { color:#a84936; background:#fbefeb; }.alerts-summary-item.tone-moderate .alerts-summary-icon { color:#916b2c; background:#f7f0df; }.alerts-summary-item.tone-low .alerts-summary-icon { color:#537a6c; background:#e8f1ed; }.alerts-summary-value { display:block; font:400 22px/1 Georgia,serif; }.alerts-summary-label { display:block; margin-top:5px; color:#718487; font-size:10px; }
        .alerts-directory { border:1px solid var(--alerts-line); background:#fff; }.alerts-toolbar { display:flex; min-height:58px; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--alerts-line); }.alerts-filter-title { display:flex; align-items:center; gap:7px; margin-right:4px; color:#648080; font-size:10px; font-weight:650; }.alerts-filter-label { color:#718487; font-size:10px; }.alerts-toolbar select { height:36px; min-width:150px; padding:0 27px 0 9px; border:1px solid var(--alerts-line); border-radius:0; color:#52696c; background:#fff; font:inherit; font-size:10px; }.alerts-toolbar select:focus { border-color:var(--alerts-green); outline:2px solid rgba(20,125,112,.12); }.alerts-result-count { margin-left:auto; color:#8a9b99; font-size:10px; white-space:nowrap; }.alerts-clear { min-height:32px; padding:0 8px; }
        .alerts-list { padding:0 14px; }.alerts-row { display:flex; align-items:flex-start; gap:11px; padding:14px 2px; border-bottom:1px solid #edf2f0; }.alerts-row:last-child { border-bottom:0; }.alerts-row-icon { display:grid; width:31px; height:31px; flex:0 0 31px; place-items:center; color:#916b2c; background:#f7f0df; }.alerts-row.severity-high .alerts-row-icon { color:#a84936; background:#fbefeb; }.alerts-row.severity-low .alerts-row-icon { color:#537a6c; background:#e8f1ed; }.alerts-row-content { min-width:0; flex:1; }.alerts-row-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }.alerts-row-heading h2 { margin:0; color:#29464a; font-size:11px; font-weight:650; line-height:1.5; overflow-wrap:anywhere; }.alerts-type { flex:0 0 auto; padding:4px 6px; color:#52696c; background:#f1f6f3; font-size:9px; }.alerts-detail { margin:6px 0 0; color:#718487; font-size:10px; line-height:1.55; }.alerts-detail b { margin-right:4px; color:#52696c; font-weight:650; }.alerts-row-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:9px; }.alerts-patient-link,.alerts-patient-name { color:var(--alerts-green); font-size:10px; font-weight:650; text-decoration:none; }.alerts-patient-link:hover { text-decoration:underline; }.alerts-severity-label { padding:3px 6px; color:#916b2c; background:#f7f0df; font-size:9px; font-weight:650; }.severity-high .alerts-severity-label { color:#a84936; background:#fbefeb; }.severity-low .alerts-severity-label { color:#537a6c; background:#e8f1ed; }.alerts-date { display:inline-flex; align-items:center; gap:4px; color:#8a9b99; font-size:9px; }
        .alerts-empty { display:grid; min-height:250px; align-content:center; justify-items:center; padding:30px 20px; text-align:center; }.alerts-empty > span { display:grid; width:42px; height:42px; place-items:center; color:var(--alerts-green); background:#eaf4f0; }.alerts-empty h2 { margin:12px 0 0; color:#29464a; font-size:13px; font-weight:650; }.alerts-empty p { margin:6px 0 12px; color:#829593; font-size:10px; }.alerts-empty button,.alerts-error button { padding:0; border:0; color:var(--alerts-green); background:transparent; font:inherit; font-size:10px; font-weight:650; text-decoration:underline; cursor:pointer; }
        .alerts-error { display:flex; align-items:center; gap:9px; margin:14px; padding:11px 12px; border:1px solid #efd1c8; color:#a84936; background:#fff5f1; font-size:10px; }.alerts-error span { flex:1; }.alerts-error button { color:#a84936; }.alerts-loading { display:grid; padding:5px 14px; }.alerts-loading span { height:60px; border-bottom:1px solid #edf2f0; background:linear-gradient(90deg,#fff 25%,#f2f7f4 40%,#fff 65%); background-size:350% 100%; animation:alerts-shimmer 1.4s ease infinite; }@keyframes alerts-shimmer { to { background-position:-100% 0; } }
        @media (max-width:760px) { .alerts-heading { align-items:flex-start; }.alerts-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.alerts-summary-item:nth-child(3) { border-left:0; border-top:1px solid var(--alerts-line); }.alerts-summary-item:nth-child(4) { border-top:1px solid var(--alerts-line); }.alerts-toolbar { flex-wrap:wrap; }.alerts-filter-title { flex-basis:100%; }.alerts-result-count { margin-left:0; }.alerts-toolbar select { flex:1; }.alerts-history-toggle { margin-left:auto; } }
        @media (max-width:480px) { .alerts-page { padding-top:0; }.alerts-heading { flex-direction:column; align-items:stretch; }.alerts-heading h1 { font-size:28px; }.alerts-refresh { align-self:flex-start; min-height:34px; }.alerts-summary-item { min-height:72px; padding:12px; }.alerts-summary-value { font-size:20px; }.alerts-toolbar { gap:8px; }.alerts-filter-title { flex-basis:100%; }.alerts-toolbar select { min-width:0; }.alerts-history-toggle { margin-left:0; }.alerts-row-heading { flex-direction:column; gap:5px; }.alerts-type { align-self:flex-start; }.alerts-row-meta { gap:7px; } }
      `}</style>
    </main>
  );
}

function SummaryButton({
  label,
  value,
  selected,
  tone,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  selected: boolean;
  tone?: "critical" | "moderate" | "low";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`alerts-summary-item${selected ? " selected" : ""}${tone ? ` tone-${tone}` : ""}`} onClick={onClick} aria-pressed={selected}>
      <span className="alerts-summary-icon">{icon}</span>
      <span><b className="alerts-summary-value">{value}</b><small className="alerts-summary-label">{label}</small></span>
    </button>
  );
}