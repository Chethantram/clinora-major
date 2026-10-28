"use client";

import { cn } from "@/lib/utils";
import {
  Users,
  LayoutDashboard,
  MessageSquare,
  Bell,
  Activity,
  Settings,
  Pill,
  FileText,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchApi } from "@/lib/backend-api";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "My Patients", href: "/patients", icon: Users },
  { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Lab Results", href: "/labs", icon: Activity },
  { name: "Medications", href: "/medications", icon: Pill },
  { name: "Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Dr. Doctor");
  const [department, setDepartment] = useState("General Medicine");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    fetchApi<{ user: { name?: string; department?: string } }>("/api/auth/session")
      .then(({ user }) => {
        if (!active) return;
        if (user.name) setDoctorName(user.name.startsWith("Dr.") ? user.name : `Dr. ${user.name}`);
        if (user.department) setDepartment(user.department);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await fetchApi("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("medai_user");
      localStorage.removeItem("medai_role");
      router.replace("/auth/login");
    } catch {
      setLogoutError("Could not sign out. Please try again.");
    }
  };

  return (
    <>
      <aside className="clinical-sidebar">
        <div className="clinical-sidebar-backdrop" />

        <div className="clinical-brand-row">
          <div className="clinical-logo-box">
            <img src="/app_logo.png" alt="Clinora AI Logo" className="clinical-logo" />
          </div>
          <div className="clinical-brand-copy">
            <span className="clinical-brand-name">Clinora AI</span>
            <span className="clinical-brand-tag">Care intelligence</span>
          </div>
        </div>

        <nav className="clinical-nav" aria-label="Main navigation">
          <ul className="clinical-nav-list">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn("clinical-nav-item", isActive && "active")}
                  >
                    <item.icon className="clinical-nav-icon" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="clinical-footer">
          {logoutError && <p role="alert" className="clinical-logout-alert">{logoutError}</p>}

          <Link
            href="/settings"
            className={cn("clinical-settings-link", pathname === "/settings" && "active")}
          >
            <Settings className="clinical-nav-icon" />
            Settings
          </Link>

          <div className="clinical-user-card">
            <div className="clinical-user-meta">
              <Avatar className="clinical-avatar">
                <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face" />
                <AvatarFallback className="clinical-avatar-fallback">AV</AvatarFallback>
              </Avatar>

              <div>
                <p className="clinical-user-name">{doctorName}</p>
                <p className="clinical-user-role">{department}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="clinical-logout-button"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .clinical-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          width: 256px;
          height: 100vh;
          border-right: 1px solid rgba(18, 49, 52, 0.1);
          background: rgba(246, 250, 249, 0.96);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 45px rgba(18, 49, 52, 0.08);
        }

        .clinical-sidebar-backdrop {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(20, 125, 112, 0.08), transparent 32%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(244, 249, 247, 0.92));
          pointer-events: none;
        }

        .clinical-brand-row,
        .clinical-nav,
        .clinical-footer {
          position: relative;
          z-index: 1;
        }

        .clinical-brand-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 82px;
          padding: 20px 18px 18px;
          border-bottom: 1px solid rgba(18, 49, 52, 0.08);
        }

        .clinical-logo-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #14313c 0%, #147d70 100%);
          box-shadow: 0 10px 22px rgba(20, 125, 112, 0.24);
        }

        .clinical-logo {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        .clinical-brand-copy {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .clinical-brand-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #15313a;
          letter-spacing: -0.03em;
        }

        .clinical-brand-tag {
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #6d8a86;
        }

        .clinical-nav {
          flex: 1;
          overflow-y: auto;
          padding: 18px 14px 12px;
        }

        .clinical-nav-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .clinical-nav-item,
        .clinical-settings-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border-radius: 12px;
          color: #536a6b;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .clinical-nav-item:hover,
        .clinical-settings-link:hover {
          background: rgba(20, 125, 112, 0.05);
          color: #15313a;
        }

        .clinical-nav-item.active,
        .clinical-settings-link.active {
          background: linear-gradient(135deg, #14313c 0%, #0f2b33 100%);
          color: #ecf5f3;
          box-shadow: 0 12px 24px rgba(20, 49, 60, 0.18);
        }

        .clinical-nav-icon {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
        }

        .clinical-footer {
          padding: 0 14px 16px;
          border-top: 1px solid rgba(18, 49, 52, 0.08);
        }

        .clinical-logout-alert {
          margin: 12px 0 8px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(168, 73, 54, 0.08);
          border: 1px solid rgba(168, 73, 54, 0.12);
          color: #8b3e31;
          font-size: 0.7rem;
          line-height: 1.5;
        }

        .clinical-settings-link {
          margin-bottom: 12px;
        }

        .clinical-user-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(18, 49, 52, 0.09);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.62);
          padding: 10px 10px 10px 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }

        .clinical-user-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .clinical-avatar {
          width: 38px !important;
          height: 38px !important;
          border: 2px solid rgba(18, 49, 52, 0.1);
        }

        .clinical-avatar-fallback {
          background: linear-gradient(135deg, #14313c 0%, #147d70 100%);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .clinical-user-name {
          margin: 0;
          color: #15313a;
          font-size: 0.79rem;
          font-weight: 700;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .clinical-user-role {
          margin: 2px 0 0;
          color: #6f8b88;
          font-size: 0.64rem;
          line-height: 1.2;
        }

        .clinical-logout-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(18, 49, 52, 0.08);
          border-radius: 10px;
          background: rgba(20, 125, 112, 0.04);
          color: #51686a;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .clinical-logout-button:hover {
          background: rgba(20, 125, 112, 0.08);
          color: #15313a;
        }

        @media (max-width: 900px) {
          .clinical-sidebar {
            width: 220px;
          }
        }
      `}</style>
    </>
  );
}
