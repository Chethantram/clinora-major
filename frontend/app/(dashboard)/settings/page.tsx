"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BrainCircuit,
  CheckCircle2,
  Database,
  LockKeyhole,
  MonitorCog,
  Palette,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { fetchApi } from "@/lib/backend-api";

type NotificationPreferences = {
  critical: boolean;
  lab: boolean;
  drug: boolean;
  email: boolean;
};

type AssistantPreferences = {
  briefs: boolean;
  trends: boolean;
  guidelines: boolean;
  interactions: boolean;
};

type SettingsResponse = {
  profile: {
    id?: string;
    name?: string;
    email?: string;
    department?: string | null;
    phone?: string | null;
    role?: string;
  };
  preferences: {
    notifications: NotificationPreferences;
    assistant: AssistantPreferences;
  };
  system?: {
    api?: string;
    database?: string;
  };
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  department: string;
  notifications: NotificationPreferences;
  assistant: AssistantPreferences;
};

const defaultPreferences = {
  notifications: { critical: true, lab: true, drug: true, email: false },
  assistant: { briefs: true, trends: true, guidelines: true, interactions: true },
};

const systemCards = [
  { key: "database", label: "Database", status: "Connected", detail: "MongoDB", ok: true },
  { key: "api", label: "API status", status: "Healthy", detail: "Express backend", ok: true },
  { key: "security", label: "Security", status: "Protected", detail: "Session verified", ok: true },
  { key: "workspace", label: "Workspace", status: "Synced", detail: "Clinical dashboard", ok: true },
];

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    department: "",
    notifications: defaultPreferences.notifications,
    assistant: defaultPreferences.assistant,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetchApi<SettingsResponse>("/api/settings");
      const profile = response.profile || {};
      const preferences = response.preferences || defaultPreferences;
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
        notifications: {
          ...defaultPreferences.notifications,
          ...(preferences.notifications || {}),
        },
        assistant: {
          ...defaultPreferences.assistant,
          ...(preferences.assistant || {}),
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to load your settings.";
      setMessage({ type: "error", text: reason });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const initials = useMemo(() => {
    const parts = form.name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "DR";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "DR";
  }, [form.name]);

  function handleProfileChange(key: "name" | "email" | "phone" | "department", value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleToggle(group: "notifications" | "assistant", key: string, value: boolean) {
    setForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        profile: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
        },
        preferences: {
          notifications: form.notifications,
          assistant: form.assistant,
        },
      };

      await fetchApi("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setMessage({ type: "success", text: "Your preferences were saved successfully." });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to save settings.";
      setMessage({ type: "error", text: reason });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">ACCOUNT <span>/</span> SETTINGS</p>
          <h1>Settings</h1>
          <p className="settings-subtitle">Manage your profile, alerts, and assistant preferences.</p>
        </div>
      </header>

      {message && (
        <div className={`settings-banner ${message.type}`} role="status" aria-live="polite">
          {message.type === "success" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-grid">
        <section className="settings-card settings-main" aria-label="Profile settings">
          <div className="settings-heading-row">
            <div className="settings-title-group">
              <span className="settings-icon"><UserCircle2 size={15} /></span>
              <h2>Profile</h2>
            </div>
          </div>

          <div className="settings-profile-summary">
            <div className="settings-avatar">{initials}</div>
            <div>
              <h3>{form.name || "Loading clinician profile..."}</h3>
              <p>{form.department || "Department not set"}</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleProfileChange("name", event.target.value)}
                disabled={loading}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} readOnly disabled />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.phone}
                placeholder="Enter phone number"
                onChange={(event) => handleProfileChange("phone", event.target.value)}
                disabled={loading}
              />
            </label>
            <label className="field">
              <span>Department</span>
              <input
                type="text"
                value={form.department}
                placeholder="Enter department"
                onChange={(event) => handleProfileChange("department", event.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <div className="settings-actions">
            <button className="settings-primary" type="button" onClick={() => void handleSave()} disabled={loading || saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>

        <aside className="settings-sidebar" aria-label="Settings sidebar">
          <section className="settings-card">
            <div className="settings-heading-row">
              <div className="settings-title-group">
                <span className="settings-icon"><Bell size={15} /></span>
                <h2>Alerts</h2>
              </div>
            </div>
            {[
              { key: "critical", label: "Critical alerts" },
              { key: "lab", label: "Lab updates" },
              { key: "drug", label: "Drug interactions" },
              { key: "email", label: "Email summary" },
            ].map((item) => (
              <div key={item.key} className="settings-toggle-row">
                <div>
                  <strong>{item.label}</strong>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${form.notifications[item.key as keyof NotificationPreferences] ? "on" : ""}`}
                  aria-label={item.label}
                  onClick={() =>
                    handleToggle(
                      "notifications",
                      item.key,
                      !form.notifications[item.key as keyof NotificationPreferences]
                    )
                  }
                >
                  <span />
                </button>
              </div>
            ))}
          </section>

          <section className="settings-card">
            <div className="settings-heading-row">
              <div className="settings-title-group">
                <span className="settings-icon"><BrainCircuit size={15} /></span>
                <h2>Assistant</h2>
              </div>
            </div>
            {[
              { key: "briefs", label: "Consultation briefs" },
              { key: "trends", label: "Trend analysis" },
              { key: "guidelines", label: "Clinical guidelines" },
              { key: "interactions", label: "Risk checks" },
            ].map((item) => (
              <div key={item.key} className="settings-toggle-row">
                <div>
                  <strong>{item.label}</strong>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${form.assistant[item.key as keyof AssistantPreferences] ? "on" : ""}`}
                  aria-label={item.label}
                  onClick={() =>
                    handleToggle(
                      "assistant",
                      item.key,
                      !form.assistant[item.key as keyof AssistantPreferences]
                    )
                  }
                >
                  <span />
                </button>
              </div>
            ))}
          </section>

          <section className="settings-card">
            <div className="settings-heading-row">
              <div className="settings-title-group">
                <span className="settings-icon"><Database size={15} /></span>
                <h2>System</h2>
              </div>
            </div>
            <div className="settings-system-list">
              {systemCards.map((item) => (
                <div key={item.key} className="settings-system-item">
                  <div className="settings-system-header">
                    <span className="settings-dot" />
                    <strong>{item.label}</strong>
                  </div>
                  <p>{item.status}</p>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="settings-card settings-lower" aria-label="Security and preferences section">
        <div className="settings-heading-row">
          <div className="settings-title-group">
            <span className="settings-icon"><LockKeyhole size={15} /></span>
            <h2>Security</h2>
          </div>
        </div>

        <div className="settings-security-grid">
          <div className="security-item">
            <div className="security-icon"><ShieldCheck size={16} /></div>
            <div>
              <strong>Password</strong>
              <p>Last updated recently. Keep your account protected.</p>
            </div>
          </div>
          <div className="security-item">
            <div className="security-icon"><MonitorCog size={16} /></div>
            <div>
              <strong>Sessions</strong>
              <p>Review active devices and manage recent sign-ins.</p>
            </div>
          </div>
          <div className="security-item">
            <div className="security-icon"><Palette size={16} /></div>
            <div>
              <strong>Appearance</strong>
              <p>Theme and display settings are aligned to the clinical workspace.</p>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .settings-page {
          --settings-ink: #15313a;
          --settings-muted: #718487;
          --settings-line: #dbe6e3;
          --settings-panel: #ffffff;
          --settings-soft: #f7fbf9;
          --settings-accent: #147d70;
          --settings-success: #166534;
          --settings-error: #a84936;
          max-width: 1440px;
          margin: 0 auto;
          padding: 8px 0 32px;
          color: var(--settings-ink);
        }

        .settings-header {
          margin-bottom: 18px;
        }

        .settings-eyebrow {
          margin: 0 0 8px;
          color: #648080;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .settings-eyebrow span {
          padding: 0 5px;
          color: #a4b3b0;
        }

        .settings-header h1 {
          margin: 0;
          font: 400 31px/1.15 Georgia, serif;
        }

        .settings-subtitle {
          margin: 8px 0 0;
          color: var(--settings-muted);
          font-size: 12px;
        }

        .settings-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 11px 12px;
          border-radius: 10px;
          font-size: 11px;
          line-height: 1.5;
        }

        .settings-banner.success {
          border: 1px solid #cfe8d6;
          background: #f1faf4;
          color: var(--settings-success);
        }

        .settings-banner.error {
          border: 1px solid #efd1c8;
          background: #fff5f1;
          color: var(--settings-error);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(290px, 0.8fr);
          gap: 16px;
          align-items: start;
        }

        .settings-card {
          border: 1px solid var(--settings-line);
          background: var(--settings-panel);
          padding: 18px 18px 16px;
        }

        .settings-main {
          min-height: 100%;
        }

        .settings-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .settings-title-group {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .settings-title-group h2 {
          margin: 0;
          color: var(--settings-ink);
          font-size: 14px;
          font-weight: 700;
        }

        .settings-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border: 1px solid var(--settings-line);
          background: var(--settings-soft);
          color: var(--settings-accent);
        }

        .settings-profile-summary {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          padding-bottom: 18px;
          border-bottom: 1px solid #edf2f0;
        }

        .settings-avatar {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #15313a, #147d70);
          color: white;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        .settings-profile-summary h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }

        .settings-profile-summary p {
          margin: 5px 0 0;
          color: var(--settings-muted);
          font-size: 11px;
        }

        .settings-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6a7d7d;
        }

        .field input {
          width: 100%;
          height: 40px;
          border: 1px solid var(--settings-line);
          border-radius: 8px;
          background: #fafdfc;
          color: var(--settings-ink);
          font: inherit;
          font-size: 12px;
          letter-spacing: normal;
          text-transform: none;
          padding: 0 12px;
        }

        .field input:focus {
          border-color: rgba(20, 125, 112, 0.55);
          outline: 2px solid rgba(20, 125, 112, 0.12);
        }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }

        .settings-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid var(--settings-accent);
          background: var(--settings-accent);
          color: white;
          font: inherit;
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .settings-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .settings-sidebar {
          display: grid;
          gap: 16px;
        }

        .settings-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 0;
          border-top: 1px solid #edf2f0;
        }

        .settings-toggle-row:first-of-type {
          border-top: 0;
        }

        .settings-toggle-row strong {
          color: var(--settings-ink);
          font-size: 12px;
          font-weight: 600;
        }

        .settings-switch {
          position: relative;
          display: inline-flex;
          width: 38px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid var(--settings-line);
          background: #e6ece9;
          padding: 2px;
          cursor: pointer;
        }

        .settings-switch span {
          display: block;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
        }

        .settings-switch.on {
          background: rgba(20, 125, 112, 0.18);
          border-color: rgba(20, 125, 112, 0.4);
        }

        .settings-switch.on span {
          transform: translateX(16px);
          background: var(--settings-accent);
        }

        .settings-system-list {
          display: grid;
          gap: 10px;
        }

        .settings-system-item {
          padding: 10px 0;
          border-top: 1px solid #edf2f0;
        }

        .settings-system-item:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .settings-system-header {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 6px;
        }

        .settings-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--settings-accent);
        }

        .settings-system-item p,
        .settings-system-item small {
          margin: 0;
        }

        .settings-system-item p {
          color: var(--settings-ink);
          font-size: 11px;
          font-weight: 700;
        }

        .settings-system-item small {
          display: block;
          margin-top: 2px;
          color: var(--settings-muted);
          font-size: 10px;
        }

        .settings-lower {
          margin-top: 16px;
        }

        .settings-security-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .security-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 0 0;
          border-top: 1px solid #edf2f0;
        }

        .security-item:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .security-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          background: var(--settings-soft);
          border: 1px solid var(--settings-line);
          color: var(--settings-accent);
        }

        .security-item strong {
          display: block;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .security-item p {
          margin: 0;
          color: var(--settings-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 960px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .settings-form-grid,
          .settings-security-grid {
            grid-template-columns: 1fr;
          }

          .settings-card {
            padding: 16px 14px;
          }

          .settings-profile-summary {
            flex-direction: column;
            align-items: flex-start;
          }

          .settings-actions {
            justify-content: stretch;
          }

          .settings-primary {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
