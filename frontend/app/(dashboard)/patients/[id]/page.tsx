"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/backend-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  AlertTriangle,
  Pill,
  Activity,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  Stethoscope,
  UserCog,
  Share2,
  ShieldAlert,
  HeartPulse,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type PatientCase = {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnoses?: string[];
  primaryDiagnosis?: string[];
  secondaryDiagnosis?: string[];
  medications?: Array<{ name: string; dose: string; frequency: string; since?: string | null }>;
  labResults?: Record<string, Array<{ date: string; value: number; unit?: string; status?: string; referenceRange?: string }>>;
  clinicalFlags?: Array<{ type: string; flag: string; date?: string | null }>;
  visits?: Array<{
    date: string;
    doctor?: string;
    department?: string;
    chiefComplaint?: string;
    clinicalNote?: string;
    plan?: string;
    symptoms?: string[];
  }>;
  allergies?: string[];
  overdueTests?: Array<{ test?: string; name?: string; reason?: string }>;
  lastVisit?: string | null;
  status?: string;
};

type Brief = {
  patientId: string;
  patientName: string;
  age: number;
  primaryDiagnosis: string[];
  currentMedications: Array<{ name: string; dose: string; frequency: string }>;
  redFlags: Array<{ type: string; flag: string }>;
  lastVisitSummary?: {
    date?: string;
    clinicalNote?: string;
    chiefComplaint?: string;
    symptoms?: string[];
  };
  allergies: string[];
  overdueTests: Array<{ test?: string; reason?: string }>;
};

type LabTrendResponse = {
  test_name: string;
  trend: "WORSENING" | "IMPROVING" | "STABLE" | "INSUFFICIENT_DATA";
  count: number;
  data: Array<{ date: string; value: number; unit?: string; status?: string; referenceRange?: string }>;
};

type BodyRegion = "head" | "chest" | "heart" | "abdomen" | "kidney" | "legs";

const statusConfig = {
  stable: { label: "Stable", dot: "#10b981", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  monitoring: { label: "Monitoring", dot: "#f59e0b", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  critical: { label: "Critical", dot: "#ef4444", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const bodyRegionPosition: Record<BodyRegion, { top: string; left: string; label: string }> = {
  head: { top: "10%", left: "50%", label: "Head" },
  chest: { top: "34%", left: "50%", label: "Chest" },
  heart: { top: "36%", left: "48%", label: "Heart" },
  abdomen: { top: "49%", left: "50%", label: "Abdomen" },
  kidney: { top: "49%", left: "50%", label: "Kidney" },
  legs: { top: "78%", left: "50%", label: "Legs" },
};

function normalizeStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("critical") || s.includes("high")) return "critical" as const;
  if (s.includes("monitor") || s.includes("medium")) return "monitoring" as const;
  return "stable" as const;
}

function parseRange(range?: string) {
  if (!range) return { min: null as number | null, max: null as number | null };
  const m = range.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  return { min: null, max: null };
}

function mapFlagToBodyRegion(flag: string): BodyRegion {
  const f = flag.toLowerCase();
  if (f.includes("head") || f.includes("migraine") || f.includes("neuro")) return "head";
  if (f.includes("heart") || f.includes("cardiac") || f.includes("ecg")) return "heart";
  if (f.includes("chest") || f.includes("lung") || f.includes("resp")) return "chest";
  if (f.includes("kidney") || f.includes("creatinine") || f.includes("renal")) return "kidney";
  if (f.includes("abd") || f.includes("liver") || f.includes("glucose") || f.includes("hba1c")) return "abdomen";
  if (f.includes("leg") || f.includes("foot") || f.includes("mobility")) return "legs";
  return "chest";
}

function normalizeDeptParts(value: string) {
  return String(value || "")
    .toLowerCase()
    .split(/&|,|\/|\band\b/)
    .map((p) => p.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isDepartmentMatch(loggedDept: string, visitDept: string) {
  const a = normalizeDeptParts(loggedDept);
  const b = normalizeDeptParts(visitDept);
  if (!a.length || !b.length) return false;
  return a.some((x) => b.some((y) => x.includes(y) || y.includes(x)));
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [patient, setPatient] = useState<PatientCase | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [flags, setFlags] = useState<Array<{ type: string; flag: string; date?: string }>>([]);
  const [overdueTests, setOverdueTests] = useState<Array<{ test?: string; reason?: string }>>([]);
  const [ragSummaryPoints, setRagSummaryPoints] = useState<string[]>([]);
  const [labTrends, setLabTrends] = useState<Record<string, LabTrendResponse>>({});
  const [hoverDot, setHoverDot] = useState<{ id: string; text: string; region: BodyRegion } | null>(null);
  const [bodyMapLoading, setBodyMapLoading] = useState(true);
  const [loggedDoctorName, setLoggedDoctorName] = useState("");
  const [loggedDoctorDept, setLoggedDoctorDept] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let mapTimer: ReturnType<typeof setTimeout> | null = null;
    if (!id) return;

    async function load() {
      try {
        const [caseRes, briefRes, flagsRes, overdueRes, ragRes] = await Promise.all([
          fetchApi<PatientCase>(`/api/patient/${id}`),
          fetchApi<Brief>(`/api/patient/${id}/brief`),
          fetchApi<Array<{ type: string; flag: string; date?: string }>>(`/api/patient/${id}/flags`),
          fetchApi<Array<{ test?: string; reason?: string }>>(`/api/patient/${id}/overdue-tests`),
          fetchApi<{ summary_points?: string[] }>(`/api/agent/rag-summary`, {
            method: "POST",
            body: JSON.stringify({ patientId: id }),
          }).catch(() => ({ summary_points: [] })),
        ]);

        if (!active) return;
        setPatient(caseRes);
        setBrief(briefRes);
        setFlags(Array.isArray(flagsRes) ? flagsRes : []);
        setOverdueTests(Array.isArray(overdueRes) ? overdueRes : []);
        setRagSummaryPoints(Array.isArray(ragRes?.summary_points) ? ragRes.summary_points : []);
        setBodyMapLoading(true);

        const tests = Object.keys(caseRes.labResults || {});
        const trends = await Promise.all(
          tests.map(async (test) => {
            try {
              const r = await fetchApi<LabTrendResponse>(`/api/patient/${id}/labs/${encodeURIComponent(test)}`);
              return [test, r] as const;
            } catch {
              return [test, { test_name: test, trend: "INSUFFICIENT_DATA", count: 0, data: [] } as LabTrendResponse] as const;
            }
          })
        );
        if (!active) return;
        setLabTrends(Object.fromEntries(trends));
        mapTimer = setTimeout(() => {
          if (active) setBodyMapLoading(false);
        }, 700);
      } catch {
        if (!active) return;
        setPatient(null);
        setBodyMapLoading(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      if (mapTimer) clearTimeout(mapTimer);
    };
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("medai_user");
      if (!raw) return;
      const user = JSON.parse(raw) as { name?: string; specialty?: string; department?: string };
      setLoggedDoctorName(user.name || "");
      setLoggedDoctorDept(user.specialty || user.department || "");
    } catch {
      // ignore malformed local user payload
    }
  }, []);

  const meds = useMemo(() => patient?.medications || [], [patient]);
  const visits = useMemo(() => patient?.visits || [], [patient]);
  const statusKey = normalizeStatus(patient?.status);
  const status = statusConfig[statusKey];
  const diagnosis = useMemo(() => {
    const combined = [...(patient?.primaryDiagnosis || []), ...(patient?.secondaryDiagnosis || [])];
    if (combined.length) return combined;
    return patient?.diagnoses || [];
  }, [patient]);

  const bodyDots = useMemo(() => {
    return flags.slice(0, 8).map((f, idx) => {
      const region = mapFlagToBodyRegion(f.flag);
      return {
        id: `${region}-${idx}`,
        region,
        text: f.flag,
        type: normalizeStatus(f.type),
      };
    });
  }, [flags]);

  const pastIssues = useMemo(() => {
    const issueSet = new Set<string>();
    visits.forEach((v) => (v.symptoms || []).forEach((s) => issueSet.add(s)));
    flags.forEach((f) => issueSet.add(f.flag));
    return [...issueSet].slice(0, 8);
  }, [visits, flags]);

  const topAlerts = useMemo(() => {
    return [...flags]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 3);
  }, [flags]);

  const sameDepartmentVisits = useMemo(() => {
    return visits
      .filter((v) => isDepartmentMatch(loggedDoctorDept, String(v.department || "")))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [visits, loggedDoctorDept]);

  if (loading) {
    return (
      <div className="p-6">
        <div
          style={{
            height: 240,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background:
              "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%)",
            backgroundSize: "400% 100%",
            animation: "bodyShimmer 1.4s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "8px 12px",
            }}
          >
            Loading patient profile...
          </span>
        </div>
      </div>
    );
  }

  if (!patient || !id) {
    return <div className="p-6 text-sm text-muted-foreground">Patient not found.</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap');

        .pd { font-family: 'IBM Plex Sans', sans-serif; }
        .pd * { box-sizing: border-box; }
        .pd-serif { font-family: 'IBM Plex Serif', serif; }

        .pd-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; }
        .pd-action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 7px; border: 1px solid #e2e8f0; background: white; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.14s; text-decoration: none; }
        .pd-action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .pd-action-btn.primary { background: #0f172a; color: white; border-color: #0f172a; }

        .pd-med-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px; border-radius: 8px; border: 1px solid #f1f5f9; background: #fafafa; margin-bottom: 8px; }
        .pd-med-row:last-child { margin-bottom: 0; }

        .pd-alert-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border-radius: 7px; border: 1px solid; margin-bottom: 8px; }
        .pd-alert-item:last-child { margin-bottom: 0; }
        .pd-alert-high { background: #fff8f8; border-color: #fecaca; border-left: 3px solid #ef4444; }
        .pd-alert-monitoring { background: #fffdf5; border-color: #fde68a; border-left: 3px solid #f59e0b; }
        .pd-alert-stable { background: #f8fafc; border-color: #e2e8f0; border-left: 3px solid #94a3b8; }

        .pd-quick-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 14px; border-radius: 7px; border: 1px solid #e2e8f0; background: white; font-size: 13px; font-weight: 500; color: #334155; margin-bottom: 8px; }

        .body-map {
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background:
            radial-gradient(circle at 50% -10%, rgba(148,163,184,0.16), transparent 36%),
            linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%);
          padding: 12px;
          overflow: hidden;
        }
        .body-map::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
          background-size: 22px 22px;
          pointer-events: none;
        }
        .body-dot {
          position: absolute;
          width: 11px;
          height: 11px;
          border-radius: 999px;
          border: 2px solid white;
          cursor: pointer;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08);
          z-index: 3;
        }
        .body-dot::after {
          content: '';
          position: absolute;
          inset: -7px;
          border-radius: 999px;
          border: 2px solid currentColor;
          opacity: 0.28;
          animation: bodyPulse 1.8s ease-out infinite;
        }
        .body-tip { position: absolute; z-index: 20; min-width: 180px; max-width: 260px; background: #0f172a; color: #f8fafc; font-size: 11px; line-height: 1.4; padding: 8px 10px; border-radius: 8px; transform: translate(-50%, -110%); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25); pointer-events: none; }
        .body-loader {
          position: absolute;
          inset: 12px;
          border-radius: 8px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 400% 100%;
          animation: bodyShimmer 1.4s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }
        .body-loader-text {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 6px 10px;
        }
        @keyframes bodyPulse {
          0% { transform: scale(0.7); opacity: 0.4; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes bodyShimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .pd {
          --detail-ink: #15313a;
          --detail-green: #147d70;
          --detail-line: #dbe6e3;
          color: var(--detail-ink);
          background: #f8fbf9 !important;
          font-family: var(--font-sans), sans-serif;
        }
        .pd-serif { font-family: Georgia, serif; }
        .pd-card { border-color: var(--detail-line); border-radius: 4px; box-shadow: none; }
        .pd-action-btn { border-color: var(--detail-line); border-radius: 4px; color: #52696c; }
        .pd-action-btn:hover { border-color: #9fbab1; background: #f7fbf9; }
        .pd-action-btn.primary { border-color: var(--detail-green); color: #fff; background: var(--detail-green); }
        .pd-action-btn.primary:hover { background: #0d655b; }
        .pd-med-row,.pd-quick-btn { border-color: #e5eeea; border-radius: 3px; background: #fbfdfc; }
        .pd-quick-btn { cursor: pointer; }
        .pd-quick-btn:hover { border-color: #9fbab1; background: #f4faf7; }
        .body-map { border-color: var(--detail-line); border-radius: 4px; background: linear-gradient(180deg,#f9fcfa,#eff6f2); }
        .body-map::before { background-image: linear-gradient(rgba(20,125,112,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(20,125,112,.055) 1px,transparent 1px); }
        .body-tip { border-radius: 3px; color: #fff; background: #15313a; }
        .pd [style*="#0f172a"] { color: #15313a !important; }
        .pd [style*="#334155"] { color: #38545a !important; }
        .pd [style*="#64748b"] { color: #61777a !important; }
        .pd [style*="#94a3b8"] { color: #829593 !important; }
        .pd [style*="#f8fafc"],.pd [style*="#f1f5f9"],.pd [style*="#fafafa"] { background-color: #f3f8f5 !important; }
        .pd [style*="#e2e8f0"] { border-color: var(--detail-line) !important; }
        .pd [style*="borderRadius: 10"],.pd [style*="borderRadius: 9"],.pd [style*="borderRadius: 8"],.pd [style*="borderRadius: 7"] { border-radius: 4px !important; }
        @media (max-width: 900px) {
          .pd > div[style*="gridTemplateColumns: 1fr 320px"] { grid-template-columns: minmax(0,1fr) 270px !important; }
        }
        @media (max-width: 720px) {
          .pd > div[style*="gridTemplateColumns: 1fr 320px"] { grid-template-columns: 1fr !important; }
          .pd > div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .pd-card { padding-left: 14px !important; padding-right: 14px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .body-dot::after,.body-loader { animation: none; }
        }
      `}</style>

      <div className="pd flex flex-col gap-5" style={{ background: "#f8fafc", padding: "2px 0 32px" }}>
        <Link href="/patients" className="pd-action-btn" style={{ width: "fit-content" }}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Patients
        </Link>

        <div className="pd-card" style={{ padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar style={{ width: 72, height: 72, border: "3px solid white", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                  <AvatarImage src={`https://i.pravatar.cc/200?u=${patient.id}`} />
                  <AvatarFallback style={{ background: "#f1f5f9", color: "#334155", fontSize: 20, fontWeight: 600 }}>
                    {patient.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span style={{ position: "absolute", bottom: 1, right: 1, width: 14, height: 14, borderRadius: "50%", border: "2px solid white", background: status.dot }} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <h1 className="pd-serif" style={{ fontSize: 22, fontWeight: 500, color: "#0f172a" }}>{patient.name}</h1>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 4, background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>{status.label}</span>
                </div>

                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                  {patient.age} yrs · {patient.gender} · <span style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{patient.id}</span>
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {diagnosis.map((d) => (
                    <span key={d} style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="pd-action-btn"><Phone style={{ width: 14, height: 14 }} /> Call</button>
              <button className="pd-action-btn"><Mail style={{ width: 14, height: 14 }} /> Email</button>
              <button className="pd-action-btn"><Share2 style={{ width: 14, height: 14 }} /> Refer</button>
              <button className="pd-action-btn primary"><FileText style={{ width: 14, height: 14 }} /> Generate Report</button>
            </div>
          </div>

          {!!patient.allergies?.length && (
            <div style={{ marginTop: 18, display: "flex", alignItems: "flex-start", gap: 10, background: "#fff8f8", border: "1px solid #fecaca", borderLeft: "3px solid #ef4444", borderRadius: 7, padding: "11px 14px" }}>
              <ShieldAlert style={{ width: 16, height: 16, color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#dc2626", marginBottom: 2 }}>Known Allergies / Cautions</p>
                <p style={{ fontSize: 12.5, color: "#991b1b" }}>{patient.allergies.join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { label: "Active Medications", value: meds.length, icon: <Pill style={{ width: 15, height: 15 }} />, warn: false },
            { label: "Visit Records", value: visits.length, icon: <Calendar style={{ width: 15, height: 15 }} />, warn: false },
            { label: "Lab Tests on File", value: Object.keys(patient.labResults || {}).length, icon: <FlaskConical style={{ width: 15, height: 15 }} />, warn: false },
            { label: "Active Alerts", value: flags.length, icon: <AlertTriangle style={{ width: 15, height: 15 }} />, warn: flags.length > 0 },
          ].map((s, i) => (
            <div key={i} className="pd-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, ...(s.warn ? { borderLeft: "2.5px solid #ef4444" } : {}) }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: s.warn ? "#fef2f2" : "#f8fafc", border: `1px solid ${s.warn ? "#fecaca" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", color: s.warn ? "#dc2626" : "#64748b", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 600, color: s.warn ? "#dc2626" : "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pd-card" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles style={{ width: 15, height: 15, color: "#475569" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>AI Consultation Brief</p>
                    <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>Auto-generated · For physician review only</p>
                  </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>Not a clinical decision</span>
              </div>

              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, lineHeight: 1.7, color: "#334155", background: "#f8fafc", borderRadius: 7, border: "1px solid #e2e8f0", padding: "14px 16px" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>
                  Patient Summary: {patient.name}
                </p>
                <p style={{ margin: "4px 0 12px" }}>
                  {patient.age}-year-old {String(patient.gender || "patient").toLowerCase()} with {diagnosis.join(", ") || "no listed diagnosis"}.
                </p>

                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>Current Medications:</p>
                <ul style={{ margin: "0 0 12px 18px", padding: 0 }}>
                  {(brief?.currentMedications?.length ? brief.currentMedications : meds).slice(0, 8).map((m, i) => (
                    <li key={`${m.name}-${i}`}>{m.name} {m.dose} {m.frequency ? `(${m.frequency})` : ""}</li>
                  ))}
                  {!((brief?.currentMedications?.length || meds.length) > 0) && <li>No active medications recorded</li>}
                </ul>

                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>Past Issues:</p>
                <ul style={{ margin: "0 0 12px 18px", padding: 0 }}>
                  {pastIssues.map((p) => <li key={p}>{p}</li>)}
                  {!pastIssues.length && <li>No major past issues recorded</li>}
                </ul>

                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>RAG Clinical Summary:</p>
                <ul style={{ margin: "0 0 12px 18px", padding: 0 }}>
                  {ragSummaryPoints.slice(0, 10).map((point, idx) => <li key={`${idx}-${point}`}>{point}</li>)}
                  {!ragSummaryPoints.length && <li>RAG summary unavailable right now.</li>}
                </ul>

                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>Last Visit Notes:</p>
                <ul style={{ margin: "0 0 12px 18px", padding: 0 }}>
                  <li>{brief?.lastVisitSummary?.date || visits[visits.length - 1]?.date || "No date"}: {brief?.lastVisitSummary?.clinicalNote || visits[visits.length - 1]?.clinicalNote || "No notes"}</li>
                  {(brief?.lastVisitSummary?.symptoms || visits[visits.length - 1]?.symptoms || []).length > 0 && (
                    <li>Symptoms: {(brief?.lastVisitSummary?.symptoms || visits[visits.length - 1]?.symptoms || []).join(", ")}</li>
                  )}
                </ul>

                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>Recommendations:</p>
                <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
                  {overdueTests.map((t, i) => <li key={`${t.test || "test"}-${i}`}>{t.test || "Recommended test"}: {t.reason || "Follow-up needed"}</li>)}
                  {!overdueTests.length && <li>Continue treatment and monitor trends.</li>}
                </ul>
              </div>
            </div>

            <div className="pd-card" style={{ padding: "20px 22px" }}>
              <Tabs defaultValue="labs">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  <TabsList style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 4, display: "flex", gap: 2, width: "fit-content" }}>
                    {[{ value: "labs", label: "Lab Results", icon: <Activity style={{ width: 14, height: 14 }} /> }, { value: "medications", label: "Medications", icon: <Pill style={{ width: 14, height: 14 }} /> }, { value: "visits", label: "Visit History", icon: <Calendar style={{ width: 14, height: 14 }} /> }].map((t) => (
                      <TabsTrigger key={t.value} value={t.value} style={{ fontSize: 13, fontWeight: 500, borderRadius: 6, padding: "6px 14px", display: "flex", alignItems: "center", gap: 5 }}>{t.icon} {t.label}</TabsTrigger>
                    ))}
                  </TabsList>

                  <details
                    style={{
                      minWidth: 260,
                      maxWidth: 360,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    <summary
                      style={{
                        listStyle: "none",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#334155",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      Same Department Visits ({sameDepartmentVisits.length})
                    </summary>
                    <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
                      {sameDepartmentVisits.length > 0 ? (
                        sameDepartmentVisits.slice(0, 8).map((v, i) => (
                          <div
                            key={`${v.date}-${v.doctor}-${i}`}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: 7,
                              background: "#f8fafc",
                              padding: "8px 9px",
                            }}
                          >
                            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{v.date || "No date"}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                              {v.doctor || "On File"} · {v.department || "General Medicine"}
                            </p>
                            {v.symptoms?.length ? (
                              <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#334155" }}>
                                {v.symptoms.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
                          No same-department visits found.
                        </p>
                      )}
                    </div>
                  </details>
                </div>

                <TabsContent value="labs">
                  {Object.keys(labTrends).length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {Object.entries(labTrends).slice(0, 6).map(([test, trend]) => {
                        const rows = trend.data || [];
                        const latest = rows.length ? rows[rows.length - 1] : null;
                        const prev = rows.length > 1 ? rows[rows.length - 2] : null;
                        const range = parseRange(latest?.referenceRange);
                        const isAbnormal = latest && range.max !== null && (latest.value > range.max || (range.min !== null && latest.value < range.min));
                        const isWorsening = latest && prev && latest.value > prev.value && isAbnormal;

                        return (
                          <div key={test} style={{ background: "#fafafa", border: `1px solid ${isAbnormal ? "#fecaca" : "#e2e8f0"}`, borderRadius: 9, padding: "16px", ...(isAbnormal ? { borderLeft: "2.5px solid #ef4444" } : {}) }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <div>
                                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>{test}</p>
                                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Normal: {latest?.referenceRange || "N/A"}</p>
                              </div>
                              {latest && (
                                <div style={{ textAlign: "right" }}>
                                  <p style={{ fontSize: 18, fontWeight: 600, color: isAbnormal ? "#dc2626" : "#15803d", lineHeight: 1 }}>{latest.value}</p>
                                  <p style={{ fontSize: 11, color: "#94a3b8" }}>{latest.unit || ""}</p>
                                </div>
                              )}
                            </div>

                            <div style={{ height: 90 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={rows} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id={`grad-${test}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={isAbnormal ? "#ef4444" : "#1e293b"} stopOpacity={0.1} />
                                      <stop offset="95%" stopColor={isAbnormal ? "#ef4444" : "#1e293b"} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide domain={["auto", "auto"]} />
                                  <Tooltip
                                    contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 11.5, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}
                                    formatter={(v: number) => [`${v} ${latest?.unit || ""}`, test]}
                                  />
                                  {range.max !== null && <ReferenceLine y={range.max} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />}
                                  <Area type="monotone" dataKey="value" stroke={isAbnormal ? "#ef4444" : "#334155"} strokeWidth={1.8} fill={`url(#grad-${test})`} dot={{ fill: isAbnormal ? "#ef4444" : "#334155", r: 2.5, strokeWidth: 0 }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>{trend.count} readings</span>
                              <span style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, color: isWorsening ? "#dc2626" : isAbnormal ? "#dc2626" : "#15803d" }}>
                                {isWorsening ? <TrendingUp style={{ width: 11, height: 11 }} /> : isAbnormal ? <Minus style={{ width: 11, height: 11 }} /> : <TrendingDown style={{ width: 11, height: 11 }} />}
                                {isWorsening ? "Worsening" : isAbnormal ? "Abnormal" : "Normal"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No lab results on file</div>
                  )}
                </TabsContent>

                <TabsContent value="medications">
                  {meds.length ? (
                    <div>
                      {meds.map((med, idx) => (
                        <div key={idx} className="pd-med-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 7, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Pill style={{ width: 16, height: 16, color: "#64748b" }} /></div>
                            <div>
                              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a" }}>{med.name}</p>
                              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{med.dose} · {med.frequency}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 11, color: "#94a3b8" }}>Started</p>
                            <p style={{ fontSize: 12.5, fontWeight: 500, color: "#475569", marginTop: 2 }}>{med.since || "N/A"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No medications recorded</div>
                  )}
                </TabsContent>

                <TabsContent value="visits">
                  {visits.length ? (
                    <div>
                      {visits.map((visit, idx) => {
                        const sameDept = isDepartmentMatch(loggedDoctorDept, String(visit.department || ""));
                        const doctorNameNorm = loggedDoctorName.toLowerCase().replace(/^dr\.?\s*/, "").trim();
                        const visitDoctorNorm = String(visit.doctor || "").toLowerCase().replace(/^dr\.?\s*/, "").trim();
                        const isSameDoctor = !!doctorNameNorm && !!visitDoctorNorm && visitDoctorNorm.includes(doctorNameNorm);
                        const referralMention = /(refer|referred|referral)/i.test(
                          `${visit.clinicalNote || ""} ${visit.plan || ""} ${visit.chiefComplaint || ""}`
                        );
                        const showReferralTag = referralMention && (isSameDoctor || sameDept);

                        return (
                        <div key={idx} style={{ marginBottom: 10, background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: 8, padding: "13px 15px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Clock style={{ width: 12, height: 12, color: "#94a3b8" }} />
                            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{visit.date || "No date"}</p>
                          </div>
                          {(sameDept || showReferralTag) && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                                marginBottom: 10,
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: 8,
                                padding: "7px 9px",
                              }}
                            >
                              {sameDept && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: "#334155",
                                    background: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 999,
                                    padding: "3px 8px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Same department
                                </span>
                              )}
                              {showReferralTag && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: "#b45309",
                                    background: "#fffbeb",
                                    border: "1px solid #fde68a",
                                    borderRadius: 999,
                                    padding: "3px 8px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Referred by this person
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                            <p style={{ fontSize: 12.5, color: "#334155" }}>
                              <span style={{ fontWeight: 600 }}>{visit.doctor || "On File"}</span>
                              {" · "}
                              <span style={{ color: "#64748b" }}>{visit.department || "General Medicine"}</span>
                            </p>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{visit.chiefComplaint || "Follow-up"}</span>
                          </div>
                          <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>{visit.clinicalNote || "No notes"}</p>
                          {visit.symptoms?.length ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                              {visit.symptoms.map((s) => <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "white", border: "1px solid #e2e8f0", color: "#475569" }}>{s}</span>)}
                            </div>
                          ) : null}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No visit records found</div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="pd-card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <HeartPulse style={{ width: 16, height: 16, color: "#475569" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Body Issue Map</p>
              </div>

              <div className="body-map" style={{ height: 300 }}>
                <svg viewBox="0 0 180 300" width="100%" height="100%" aria-label="Body map" style={{ position: "relative", zIndex: 2 }}>
                  <defs>
                    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dbe3ef" />
                      <stop offset="100%" stopColor="#cfd9e7" />
                    </linearGradient>
                  </defs>
                  <circle cx="90" cy="28" r="18" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                  <rect x="70" y="48" width="40" height="92" rx="18" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                  <rect x="48" y="58" width="18" height="76" rx="9" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                  <rect x="114" y="58" width="18" height="76" rx="9" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                  <rect x="74" y="140" width="15" height="122" rx="8" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                  <rect x="91" y="140" width="15" height="122" rx="8" fill="url(#bodyGrad)" stroke="#b8c6d8" />
                </svg>

                {bodyMapLoading && (
                  <div className="body-loader">
                    <span className="body-loader-text">Analyzing clinical issue map...</span>
                  </div>
                )}

                {!bodyMapLoading && bodyDots.map((dot) => {
                  const pos = bodyRegionPosition[dot.region];
                  const color = dot.type === "critical" ? "#ef4444" : dot.type === "monitoring" ? "#f59e0b" : "#94a3b8";
                  return (
                    <div
                      key={dot.id}
                      className="body-dot"
                      style={{ top: pos.top, left: pos.left, background: color, color }}
                      onMouseEnter={() => setHoverDot({ id: dot.id, text: dot.text, region: dot.region })}
                      onMouseLeave={() => setHoverDot((prev) => (prev?.id === dot.id ? null : prev))}
                    />
                  );
                })}

                {!bodyMapLoading && hoverDot && (
                  <div className="body-tip" style={{ top: bodyRegionPosition[hoverDot.region].top, left: bodyRegionPosition[hoverDot.region].left }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{bodyRegionPosition[hoverDot.region].label}</div>
                    {hoverDot.text}
                  </div>
                )}
              </div>
            </div>

            <div className="pd-card" style={{ padding: "18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {topAlerts.length > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />}
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Active Alerts</p>
                </div>
                {flags.length > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#fef2f2", color: "#dc2626" }}>
                    {topAlerts.length} shown
                  </span>
                )}
              </div>
              {flags.length > 3 && (
                <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                  Showing latest 3 of {flags.length} total alerts
                </p>
              )}

              {topAlerts.length > 0 ? (
                <div>
                  {topAlerts.map((alert, idx) => {
                    const sev = normalizeStatus(alert.type);
                    return (
                      <div key={`${alert.flag}-${idx}`} className={`pd-alert-item pd-alert-${sev}`}>
                        <div style={{ marginTop: 4, width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: sev === "critical" ? "#ef4444" : sev === "monitoring" ? "#f59e0b" : "#94a3b8" }} />
                        <div>
                          <p style={{ fontSize: 12.5, fontWeight: 500, color: "#0f172a", lineHeight: 1.45 }}>{alert.flag}</p>
                          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{alert.date || "On record"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No active alerts</div>
              )}
            </div>

            <div className="pd-card" style={{ padding: "18px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>Quick Actions</p>
              {[
                { label: "Order Lab Test", icon: <FlaskConical style={{ width: 14, height: 14 }} /> },
                { label: "Schedule Follow-up", icon: <Calendar style={{ width: 14, height: 14 }} /> },
                { label: "Add Prescription", icon: <Pill style={{ width: 14, height: 14 }} /> },
                { label: "Refer to Specialist", icon: <Share2 style={{ width: 14, height: 14 }} /> },
                { label: "Second Opinion", icon: <UserCog style={{ width: 14, height: 14 }} /> },
              ].map((a) => (
                <button key={a.label} className="pd-quick-btn">
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155" }}><span style={{ color: "#64748b" }}>{a.icon}</span>{a.label}</span>
                  <ChevronRight style={{ width: 14, height: 14, color: "#cbd5e1" }} />
                </button>
              ))}
            </div>

            <div className="pd-card" style={{ padding: "18px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>Patient Details</p>
              {[
                { label: "Patient ID", value: patient.id },
                { label: "Age", value: `${patient.age} years` },
                { label: "Gender", value: patient.gender },
                { label: "Last Visit", value: patient.lastVisit || (visits.length ? visits[visits.length - 1]?.date : "—") },
                { label: "Status", value: status.label },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{row.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "#334155", fontFamily: row.label === "Patient ID" ? "monospace" : "inherit" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
