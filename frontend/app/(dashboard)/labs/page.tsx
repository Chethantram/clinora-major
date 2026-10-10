"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Beaker,
  Check,
  Download,
  FlaskConical,
  RefreshCw,
  TestTube2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Patient {
  patient_id: string;
  name: string;
  age?: number | null;
  gender?: string;
  diagnosis?: string[];
}

interface LabResult {
  id: string;
  patient_id: string;
  patient_name: string;
  test: string;
  value: number | null;
  unit: string;
  date: string | null;
  status: string;
  normal_range: string;
  normalRange: { min?: number; max?: number };
  lab_name?: string;
}

interface LabTestOrder {
  id: string;
  patient_id: string;
  test: string;
  priority: string;
  notes: string;
  status: "Requested" | "Approved" | "Rejected";
  created_at: string;
}

const orderableTests = ["CBC", "Lipid Profile", "Thyroid Function Test"];

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isAbnormal(result: LabResult) {
  const status = result.status.toLowerCase();
  if (/critical|high|abnormal|borderline|\blow\b/.test(status)) return true;
  if (/\bnormal\b/.test(status)) return false;
  if (result.value === null) return false;
  return (result.normalRange.min !== undefined && result.value < result.normalRange.min)
    || (result.normalRange.max !== undefined && result.value > result.normalRange.max);
}

function isWithinRange(result: LabResult) {
  if (isAbnormal(result)) return false;
  if (/\bnormal\b/.test(result.status.toLowerCase())) return true;
  if (result.value === null) return false;
  const hasRange = result.normalRange.min !== undefined || result.normalRange.max !== undefined;
  return hasRange
    && (result.normalRange.min === undefined || result.value >= result.normalRange.min)
    && (result.normalRange.max === undefined || result.value <= result.normalRange.max);
}

function formatRange(result: LabResult) {
  if (result.normal_range) return result.normal_range;
  const { min, max } = result.normalRange;
  if (min !== undefined && max !== undefined) return `${min}–${max}`;
  if (min !== undefined) return `>${min}`;
  if (max !== undefined) return `<${max}`;
  return "Not provided";
}

export default function LabsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [orders, setOrders] = useState<LabTestOrder[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [orderTest, setOrderTest] = useState("");
  const [orderPriority, setOrderPriority] = useState("Routine");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderActionId, setOrderActionId] = useState<string | null>(null);
  const [orderActionError, setOrderActionError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setOrdersLoading(true);
    setLoadError("");
    setOrdersError("");

    const [patientResult, labResult, orderResult] = await Promise.allSettled([
      fetchApi<Patient[]>("/api/patients"),
      fetchApi<LabResult[]>("/api/labs"),
      fetchApi<{ orders?: LabTestOrder[] }>("/api/lab-test-orders"),
    ]);

    if (patientResult.status === "fulfilled") setPatients(Array.isArray(patientResult.value) ? patientResult.value : []);
    else {
      setPatients([]);
      setLoadError("Patient records could not be loaded. Check your connection and try again.");
    }

    if (labResult.status === "fulfilled") setLabResults(Array.isArray(labResult.value) ? labResult.value : []);
    else {
      setLabResults([]);
      setLoadError("Lab results could not be loaded. Check your connection and try again.");
    }

    if (orderResult.status === "fulfilled") setOrders(Array.isArray(orderResult.value.orders) ? orderResult.value.orders : []);
    else {
      setOrders([]);
      setOrdersError("Test requests could not be loaded.");
    }

    setLoading(false);
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedPatient && patients.length > 0) setSelectedPatient(patients[0].patient_id);
  }, [patients, selectedPatient]);

  const patient = useMemo(() => patients.find((item) => item.patient_id === selectedPatient), [patients, selectedPatient]);
  const patientLabs = useMemo(
    () => labResults
      .filter((result) => result.patient_id === selectedPatient)
      .sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime()),
    [labResults, selectedPatient]
  );
  const availableTests = useMemo(() => [...new Set(patientLabs.map((result) => result.test))], [patientLabs]);

  useEffect(() => {
    if (availableTests.length > 0 && !availableTests.includes(selectedTest)) setSelectedTest(availableTests[0]);
    if (availableTests.length === 0) setSelectedTest("");
  }, [availableTests, selectedTest]);

  const trendData = useMemo(() => patientLabs
    .filter((result) => result.test === selectedTest && result.value !== null)
    .slice()
    .sort((first, second) => new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime())
    .map((result) => ({
      date: result.date || "",
      value: result.value as number,
      normalMin: result.normalRange.min,
      normalMax: result.normalRange.max,
    })), [patientLabs, selectedTest]);

  const latestResult = patientLabs.find((result) => result.test === selectedTest);
  const previousValue = trendData.length > 1 ? trendData[trendData.length - 2].value : null;
  const currentValue = trendData.length > 0 ? trendData[trendData.length - 1].value : null;
  const change = currentValue !== null && previousValue !== null && previousValue !== 0
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    : null;
  const abnormalCount = labResults.filter(isAbnormal).length;
  const normalCount = labResults.filter(isWithinRange).length;
  const testsToOrder = [...new Set([...labResults.map((result) => result.test), ...orderableTests])];

  function exportResults() {
    const rows = labResults
      .filter((result) => result.patient_id === selectedPatient)
      .map((result) => [result.patient_id, result.patient_name, result.test, result.value ?? "", result.unit, formatRange(result), result.status, result.date || ""]);
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [["patient_id", "patient_name", "test", "value", "unit", "reference_range", "status", "date"], ...rows]
      .map((row) => row.map(quote).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `lab-results-${selectedPatient || "patient"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function submitOrder() {
    if (!selectedPatient || !orderTest.trim()) return;
    setOrderMessage("");
    try {
      const response = await fetchApi<{ order: LabTestOrder }>("/api/lab-test-orders", {
        method: "POST",
        body: JSON.stringify({ patient_id: selectedPatient, test: orderTest, priority: orderPriority, notes: orderNotes.trim() }),
      });
      setOrders((current) => [response.order, ...current]);
      setOrderMessage(`Request saved for ${patient?.name || selectedPatient}.`);
      setOrderNotes("");
    } catch {
      setOrderMessage("The request could not be saved. Check your connection and try again.");
    }
  }

  async function updateOrderStatus(orderId: string, status: "Approved" | "Rejected") {
    setOrderActionId(orderId);
    setOrderActionError("");
    try {
      const response = await fetchApi<{ order: LabTestOrder }>(`/api/lab-test-orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewed_by: "Clinician" }),
      });
      setOrders((current) => current.map((order) => order.id === orderId ? response.order : order));
    } catch {
      setOrderActionError("The request could not be updated. Please try again.");
    } finally {
      setOrderActionId(null);
    }
  }

  return (
    <main className="labs-page">
      <header className="labs-heading">
        <div>
          <p className="labs-eyebrow">DIAGNOSTICS <span>/</span> LAB RESULTS</p>
          <h1>Laboratory results</h1>
          <p className="labs-subtitle">Review patient measurements and trends over time.</p>
        </div>
        <div className="labs-heading-actions">
          <button className="labs-secondary-button" type="button" onClick={exportResults} disabled={loading || patientLabs.length === 0}><Download size={15} /> Export</button>
          <button className="labs-primary-button" type="button" onClick={() => { setOrderMessage(""); setOrderTest(selectedTest || testsToOrder[0] || ""); setIsOrderOpen(true); }} disabled={patients.length === 0}><Beaker size={15} /> Order test</button>
          <button className="labs-icon-button" type="button" onClick={() => void loadData()} disabled={loading} aria-label="Refresh lab results" title="Refresh lab results"><RefreshCw size={15} className={loading ? "labs-spin" : ""} /></button>
        </div>
      </header>

      <section className="labs-summary" aria-label="Lab results summary">
        <SummaryItem icon={<FlaskConical size={17} />} label="Recorded results" value={labResults.length} />
        <SummaryItem icon={<AlertTriangle size={17} />} label="Outside range" value={abnormalCount} tone="critical" />
        <SummaryItem icon={<TestTube2 size={17} />} label="Within range" value={normalCount} tone="stable" />
        <SummaryItem icon={<Activity size={17} />} label="Patients" value={patients.length} />
      </section>

      {loadError && <div className="labs-error" role="alert"><AlertTriangle size={16} /><span>{loadError}</span><button type="button" onClick={() => void loadData()}>Retry</button></div>}

      <section className="labs-workspace">
        <article className="labs-panel labs-trend-panel">
          <div className="labs-panel-header">
            <div><h2>Result trend</h2><p>Numeric measurements by collection date</p></div>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="labs-select"><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>{patients.map((item) => <SelectItem key={item.patient_id} value={item.patient_id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {availableTests.length > 0 && <div className="labs-test-tabs" role="tablist" aria-label="Lab tests">
            {availableTests.map((test) => <button key={test} type="button" role="tab" aria-selected={selectedTest === test} className={selectedTest === test ? "is-active" : ""} onClick={() => setSelectedTest(test)}>{test}</button>)}
          </div>}

          {latestResult ? (
            <>
              <div className="labs-current-stats">
                <div><small>Latest result</small><b className={isAbnormal(latestResult) ? "is-abnormal" : ""}>{latestResult.value ?? "—"} <span>{latestResult.unit}</span></b><em>{formatDate(latestResult.date)}</em></div>
                <div><small>Change from prior</small><b>{change === null ? "—" : <>{change > 0 && <ArrowUpRight size={15} />} {change < 0 && <ArrowDownRight size={15} />} {change > 0 ? "+" : ""}{change.toFixed(1)}%</>}</b><em>{change === null ? "Insufficient readings" : "Most recent interval"}</em></div>
                <div><small>Reference range</small><b>{formatRange(latestResult)}</b><em>{latestResult.status || "Status unavailable"}</em></div>
              </div>
              {trendData.length > 0 ? (
                <div className="labs-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <defs><linearGradient id="lab-result-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#147d70" stopOpacity={0.18} /><stop offset="100%" stopColor="#147d70" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="#e8efec" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 10 }} tickFormatter={(value) => value ? new Date(value).toLocaleDateString("en", { month: "short", year: "2-digit" }) : ""} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#829593", fontSize: 10 }} />
                      <Tooltip contentStyle={{ border: "1px solid #dbe6e3", borderRadius: 3, boxShadow: "0 8px 24px rgba(21,49,58,.08)", fontSize: 11 }} formatter={(value) => [`${value} ${latestResult.unit}`, selectedTest]} labelFormatter={(value) => formatDate(String(value))} />
                      {latestResult.normalRange.max !== undefined && <ReferenceLine y={latestResult.normalRange.max} stroke="#bd654d" strokeDasharray="4 4" />}
                      {latestResult.normalRange.min !== undefined && <ReferenceLine y={latestResult.normalRange.min} stroke="#147d70" strokeDasharray="4 4" />}
                      <Area type="monotone" dataKey="value" stroke="#147d70" strokeWidth={2} fill="url(#lab-result-fill)" activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="labs-chart-empty">No numeric measurements are available for this test.</p>}
            </>
          ) : loading ? (
            <div className="labs-chart-loading" role="status">Loading laboratory results...</div>
          ) : (
            <div className="labs-empty"><span><FlaskConical size={19} /></span><h3>{patient ? "No results for this patient" : "Select a patient"}</h3><p>{patient ? "Laboratory measurements will appear here when available." : "Patient records are not available yet."}</p></div>
          )}
        </article>

        <aside className="labs-panel labs-recent-panel">
          <div className="labs-panel-header labs-recent-header"><div><h2>Recent results</h2><p>{patient?.name || "Patient record"}</p></div>{patient && <Link href={`/patients/${encodeURIComponent(patient.patient_id)}`}>Open record</Link>}</div>
          {patientLabs.length === 0 && !loading ? <p className="labs-no-recent">No results to display.</p> : (
            <div className="labs-recent-list">
              {patientLabs.slice(0, 12).map((result) => {
                const abnormal = isAbnormal(result);
                return <button key={result.id} type="button" className={`labs-result-row${selectedTest === result.test ? " is-selected" : ""}`} onClick={() => setSelectedTest(result.test)}>
                  <span className={`labs-result-icon${abnormal ? " is-abnormal" : ""}`}><Activity size={14} /></span>
                  <span className="labs-result-main"><b>{result.test}</b><small>{formatDate(result.date)}</small></span>
                  <span className="labs-result-value"><b>{result.value ?? "—"} <small>{result.unit}</small></b><em className={abnormal ? "is-abnormal" : ""}>{result.status || (abnormal ? "Outside range" : "Recorded")}</em></span>
                </button>;
              })}
            </div>
          )}
        </aside>
      </section>

      <section className="labs-panel labs-orders-panel">
        <div className="labs-panel-header"><div><h2>Test requests</h2><p>Review and update pending requests.</p></div><span className="labs-pending-count">{orders.filter((order) => order.status === "Requested").length} pending</span></div>
        {ordersError && <p className="labs-orders-error" role="alert">{ordersError}</p>}
        {orderActionError && <p className="labs-orders-error" role="alert">{orderActionError}</p>}
        {ordersLoading ? <p className="labs-orders-empty">Loading test requests...</p> : orders.length === 0 ? <p className="labs-orders-empty">No test requests have been recorded.</p> : (
          <div className="labs-orders-list">
            {orders.slice(0, 8).map((order) => {
              const orderPatient = patients.find((item) => item.patient_id === order.patient_id);
              const pending = order.status === "Requested";
              return <article key={order.id} className="labs-order-row">
                <div className="labs-order-details"><b>{order.test}</b><span>{orderPatient?.name || order.patient_id} · {order.priority} · {formatDate(order.created_at)}</span>{order.notes && <small>{order.notes}</small>}</div>
                {pending ? <div className="labs-order-actions"><button type="button" className="labs-reject" onClick={() => void updateOrderStatus(order.id, "Rejected")} disabled={orderActionId === order.id}>Reject</button><button type="button" className="labs-approve" onClick={() => void updateOrderStatus(order.id, "Approved")} disabled={orderActionId === order.id}><Check size={13} /> Approve</button></div> : <span className={`labs-order-status ${order.status.toLowerCase()}`}>{order.status}</span>}
              </article>;
            })}
          </div>
        )}
      </section>

      <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Order a lab test</DialogTitle><DialogDescription>Create a request for the selected patient.</DialogDescription></DialogHeader>
          <div className="labs-order-form">
            <label>Patient<select value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>{patients.map((item) => <option key={item.patient_id} value={item.patient_id}>{item.name} ({item.patient_id})</option>)}</select></label>
            <label>Test<select value={orderTest} onChange={(event) => setOrderTest(event.target.value)}>{testsToOrder.map((test) => <option key={test} value={test}>{test}</option>)}</select></label>
            <label>Priority<select value={orderPriority} onChange={(event) => setOrderPriority(event.target.value)}><option>Routine</option><option>Urgent</option><option>Stat</option></select></label>
            <label>Clinical notes<textarea value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} rows={3} placeholder="Optional reason or instructions" /></label>
            {orderMessage && <p className="labs-order-message" role="status">{orderMessage}</p>}
          </div>
          <DialogFooter>
            <button type="button" className="labs-secondary-button" onClick={() => setIsOrderOpen(false)}>Close</button>
            <button type="button" className="labs-primary-button" onClick={() => void submitOrder()} disabled={!selectedPatient || !orderTest.trim()}><Beaker size={14} /> Submit request</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .labs-page { --labs-ink:#15313a; --labs-muted:#718487; --labs-line:#dbe6e3; --labs-green:#147d70; max-width:1440px; margin:0 auto; padding:8px 0 38px; color:var(--labs-ink); }
        .labs-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:23px; }.labs-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.labs-eyebrow span { padding:0 5px; color:#a4b3b0; }.labs-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.labs-subtitle { margin:8px 0 0; color:var(--labs-muted); font-size:12px; }.labs-heading-actions { display:flex; align-items:center; gap:7px; }
        .labs-primary-button,.labs-secondary-button,.labs-icon-button { display:inline-flex; min-height:36px; align-items:center; justify-content:center; gap:7px; padding:0 11px; border:1px solid var(--labs-line); border-radius:3px; color:#52696c; background:#fff; font:inherit; font-size:10px; text-decoration:none; white-space:nowrap; cursor:pointer; }.labs-primary-button { border-color:var(--labs-green); color:#fff; background:var(--labs-green); font-weight:650; }.labs-primary-button:hover { background:#0d655b; }.labs-secondary-button:hover,.labs-icon-button:hover { border-color:#9fbab1; color:var(--labs-green); background:#f7fbf9; }.labs-primary-button:disabled,.labs-secondary-button:disabled,.labs-icon-button:disabled { opacity:.55; cursor:wait; }.labs-icon-button { width:36px; padding:0; }.labs-spin { animation:labs-spin 1s linear infinite; }@keyframes labs-spin { to { transform:rotate(360deg); } }
        .labs-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:14px; border:1px solid var(--labs-line); background:#fff; }.labs-summary-item { display:flex; min-height:78px; align-items:center; gap:12px; padding:14px 17px; }.labs-summary-item + .labs-summary-item { border-left:1px solid var(--labs-line); }.labs-summary-icon { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--labs-green); background:#eaf4f0; }.labs-summary-item.tone-critical .labs-summary-icon { color:#a84936; background:#fbefeb; }.labs-summary-item.tone-stable .labs-summary-icon { color:#537a6c; background:#e8f1ed; }.labs-summary-value { display:block; font:400 22px/1 Georgia,serif; }.labs-summary-label { display:block; margin-top:5px; color:#718487; font-size:10px; }
        .labs-error,.labs-orders-error { display:flex; align-items:center; gap:9px; margin:0 0 14px; padding:11px 12px; border:1px solid #efd1c8; color:#a84936; background:#fff5f1; font-size:10px; }.labs-error span { flex:1; }.labs-error button { border:0; color:#a84936; background:transparent; font:inherit; font-weight:700; text-decoration:underline; cursor:pointer; }
        .labs-workspace { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,340px); gap:14px; margin-bottom:14px; }.labs-panel { min-width:0; border:1px solid var(--labs-line); background:#fff; }.labs-trend-panel,.labs-recent-panel,.labs-orders-panel { padding:17px 18px; }.labs-panel-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }.labs-panel-header h2 { margin:0; color:#29464a; font-size:12px; font-weight:700; }.labs-panel-header p { margin:5px 0 0; color:#829593; font-size:10px; }.labs-select { width:190px; height:34px; border-color:var(--labs-line); border-radius:2px; color:#52696c; background:#fff; font-size:10px; }.labs-select:focus { border-color:var(--labs-green); box-shadow:0 0 0 2px rgba(20,125,112,.1); }
        .labs-test-tabs { display:flex; gap:5px; margin:15px 0; overflow-x:auto; }.labs-test-tabs button { padding:6px 9px; border:1px solid var(--labs-line); color:#718487; background:#fff; font:inherit; font-size:9px; white-space:nowrap; cursor:pointer; }.labs-test-tabs button:hover,.labs-test-tabs button.is-active { border-color:#b7d5ca; color:var(--labs-green); background:#f5faf7; }
        .labs-current-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:15px 0 12px; }.labs-current-stats > div { min-width:0; padding:10px 11px; border:1px solid #e8efec; background:#fbfdfc; }.labs-current-stats small,.labs-current-stats b,.labs-current-stats em { display:block; }.labs-current-stats small { color:#829593; font-size:9px; }.labs-current-stats b { margin-top:6px; color:#29464a; font-size:15px; font-weight:650; overflow-wrap:anywhere; }.labs-current-stats b span { color:#829593; font-size:10px; font-weight:400; }.labs-current-stats b.is-abnormal { color:#a84936; }.labs-current-stats em { margin-top:4px; color:#8a9b99; font-size:9px; font-style:normal; }
        .labs-chart { height:230px; }.labs-chart-empty,.labs-chart-loading { display:grid; min-height:170px; place-items:center; color:#829593; font-size:10px; }.labs-chart-loading { background:linear-gradient(90deg,#fff 25%,#f2f7f4 40%,#fff 65%); background-size:350% 100%; animation:labs-shimmer 1.4s ease infinite; }@keyframes labs-shimmer { to { background-position:-100% 0; } }
        .labs-recent-header { margin-bottom:12px; }.labs-recent-header a { color:var(--labs-green); font-size:9px; font-weight:650; text-decoration:none; white-space:nowrap; }.labs-recent-header a:hover { text-decoration:underline; }.labs-recent-list { display:grid; }.labs-result-row { display:flex; width:100%; min-width:0; align-items:center; gap:8px; padding:9px 4px; border:0; border-top:1px solid #edf2f0; background:#fff; text-align:left; cursor:pointer; }.labs-result-row:hover,.labs-result-row.is-selected { background:#f7fbf9; }.labs-result-icon { display:grid; width:28px; height:28px; flex:0 0 28px; place-items:center; color:#537a6c; background:#e8f1ed; }.labs-result-icon.is-abnormal { color:#a84936; background:#fbefeb; }.labs-result-main { min-width:0; flex:1; }.labs-result-main b,.labs-result-main small,.labs-result-value b,.labs-result-value em { display:block; }.labs-result-main b { overflow:hidden; color:#435c5e; font-size:9px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }.labs-result-main small { margin-top:4px; color:#8a9b99; font-size:8px; }.labs-result-value { flex:0 0 auto; text-align:right; }.labs-result-value b { color:#29464a; font-size:10px; font-weight:650; }.labs-result-value b small { display:inline; color:#829593; font-size:8px; font-weight:400; }.labs-result-value em { margin-top:3px; color:#537a6c; font-size:8px; font-style:normal; }.labs-result-value em.is-abnormal { color:#a84936; }.labs-no-recent { margin:18px 0; color:#829593; font-size:10px; }
        .labs-orders-panel .labs-panel-header { margin-bottom:12px; }.labs-pending-count { padding:4px 7px; color:#916b2c; background:#f7f0df; font-size:9px; font-weight:650; }.labs-orders-list { display:grid; }.labs-order-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 2px; border-top:1px solid #edf2f0; }.labs-order-details { display:grid; min-width:0; gap:4px; }.labs-order-details b { color:#29464a; font-size:10px; }.labs-order-details span,.labs-order-details small { color:#829593; font-size:9px; overflow-wrap:anywhere; }.labs-order-actions { display:flex; flex:0 0 auto; gap:6px; }.labs-order-actions button { display:inline-flex; min-height:29px; align-items:center; justify-content:center; gap:4px; padding:0 8px; border:1px solid var(--labs-line); border-radius:2px; background:#fff; font:inherit; font-size:9px; cursor:pointer; }.labs-order-actions button:disabled { opacity:.5; cursor:wait; }.labs-approve { border-color:#147d70 !important; color:#fff; background:#147d70 !important; }.labs-reject { color:#a84936; }.labs-order-status { font-size:9px; font-weight:650; }.labs-order-status.approved { color:#537a6c; }.labs-order-status.rejected { color:#a84936; }.labs-orders-empty { margin:0; padding:12px 0 3px; color:#829593; font-size:10px; }.labs-orders-error { margin:0 0 8px; }
        .labs-empty { display:grid; min-height:250px; align-content:center; justify-items:center; padding:22px; text-align:center; }.labs-empty > span { display:grid; width:42px; height:42px; place-items:center; color:var(--labs-green); background:#eaf4f0; }.labs-empty h3 { margin:12px 0 0; color:#29464a; font-size:12px; font-weight:650; }.labs-empty p { margin:6px 0 0; color:#829593; font-size:10px; }
        .labs-order-form { display:grid; gap:12px; padding:8px 0; }.labs-order-form label { display:grid; gap:6px; color:#52696c; font-size:10px; font-weight:650; }.labs-order-form input,.labs-order-form select,.labs-order-form textarea { width:100%; min-height:36px; padding:8px 9px; border:1px solid var(--labs-line); border-radius:2px; color:#29464a; background:#fff; font:inherit; font-size:11px; }.labs-order-form textarea { resize:vertical; }.labs-order-message { margin:0; color:var(--labs-green); font-size:10px; }
        @media (max-width:900px) { .labs-workspace { grid-template-columns:minmax(0,1fr) minmax(250px,300px); }.labs-trend-panel,.labs-recent-panel,.labs-orders-panel { padding:14px; } }
        @media (max-width:760px) { .labs-heading { align-items:flex-start; }.labs-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.labs-summary-item:nth-child(3) { border-left:0; border-top:1px solid var(--labs-line); }.labs-summary-item:nth-child(4) { border-top:1px solid var(--labs-line); }.labs-workspace { grid-template-columns:1fr; }.labs-recent-panel { order:2; }.labs-trend-panel { order:1; } }
        @media (max-width:480px) { .labs-page { padding-top:0; }.labs-heading { flex-direction:column; align-items:stretch; }.labs-heading h1 { font-size:28px; }.labs-heading-actions { align-self:flex-start; }.labs-summary-item { min-height:72px; padding:12px; }.labs-summary-value { font-size:20px; }.labs-panel-header { flex-direction:column; }.labs-select { width:100%; }.labs-current-stats { grid-template-columns:1fr; }.labs-chart { height:205px; }.labs-order-row { align-items:flex-start; flex-direction:column; }.labs-order-actions { align-self:flex-end; } }
      `}</style>
    </main>
  );
}

function SummaryItem({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone?: "critical" | "stable" }) {
  return <div className={`labs-summary-item${tone ? ` tone-${tone}` : ""}`}><span className="labs-summary-icon">{icon}</span><span><b className="labs-summary-value">{value}</b><small className="labs-summary-label">{label}</small></span></div>;
}