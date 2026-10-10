"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Stethoscope, UserCog } from "lucide-react";
import { DM_Sans, Syne } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"] });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700"] });

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000";

type Role = "doctor" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasAuthCookie = document.cookie.includes("medai_auth=1");
    if (hasAuthCookie) {
      router.replace("/dashboard");
    }
  }, [router]);

  const roleLabel = useMemo(() => (role === "doctor" ? "Doctor" : "Admin"), [role]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      localStorage.setItem("medai_user", JSON.stringify(data.user));
      localStorage.setItem("medai_role", role);
      document.cookie = "medai_auth=1; path=/; max-age=2592000; samesite=lax";
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${dmSans.className} min-h-screen overflow-hidden`} style={{ background: "#040d1a" }}>
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_30%_30%,rgba(0,180,216,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(0,119,182,0.18),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(226,232,240,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[60%_40%]">
        <section className="relative hidden flex-col justify-between p-12 lg:flex">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "#1a2d4a", background: "rgba(10,22,40,0.85)" }}>
              <div className="rounded-xl p-2" style={{ background: "linear-gradient(135deg,#00b4d8,#0077b6)" }}>
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`${syne.className} text-xl tracking-wide`} style={{ color: "#e2e8f0" }}>
                  MedAI Pro
                </p>
                <p className="text-xs" style={{ color: "#4a6fa5" }}>Doctor Panel</p>
              </div>
            </div>
            <h1 className={`${syne.className} max-w-xl text-5xl leading-tight`} style={{ color: "#e2e8f0" }}>
              Intelligent Clinical AI for Modern Medicine
            </h1>
            <p className="mt-5 max-w-lg text-lg" style={{ color: "#4a6fa5" }}>
              Access patient intelligence, RAG-powered summaries, and high-confidence decision support.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              {["RAG System", "Drug Check", "Lab Trends"].map((pill) => (
                <span key={pill} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: "rgba(0,180,216,0.35)", color: "#e2e8f0", background: "rgba(10,22,40,0.75)" }}>
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative h-24 overflow-hidden rounded-xl border" style={{ borderColor: "rgba(0,180,216,0.2)", background: "rgba(10,22,40,0.55)" }}>
            <svg viewBox="0 0 1200 120" className="absolute inset-0 h-full w-full">
              <path
                d="M0,60 L120,60 L160,20 L210,100 L280,10 L330,80 L420,60 L560,60 L600,30 L660,90 L730,20 L820,65 L1200,65"
                fill="none"
                stroke="#00b4d8"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dasharray" values="0,2400;2400,0" dur="5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div
            className={`w-full max-w-md rounded-3xl border p-7 shadow-2xl backdrop-blur-xl transition-all ${shake ? "translate-x-1" : ""}`}
            style={{ background: "rgba(10,22,40,0.85)", borderColor: "rgba(0,180,216,0.2)", boxShadow: "0 0 40px rgba(0,180,216,0.12)" }}
          >
            <h2 className={`${syne.className} text-3xl`} style={{ color: "#e2e8f0" }}>Welcome Back</h2>
            <p className="mt-2 text-sm" style={{ color: "#4a6fa5" }}>
              Sign in as {roleLabel} to continue.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl p-1" style={{ background: "#061020", border: "1px solid #1a2d4a" }}>
              {(["doctor", "admin"] as Role[]).map((r) => {
                const selected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition-all"
                    style={selected ? { background: "linear-gradient(135deg,#00b4d8,#0077b6)", color: "#e2e8f0", boxShadow: "0 0 16px rgba(0,180,216,0.35)" } : { color: "#4a6fa5" }}
                  >
                    {r === "doctor" ? "Doctor" : "Admin"}
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: "#4a6fa5" }}>Email</span>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-3" style={{ borderColor: "#1a2d4a", background: "#061020" }}>
                  <Mail className="h-4 w-4" style={{ color: "#4a6fa5" }} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="doctor@medai.com"
                    className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#4a6fa5]"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: "#4a6fa5" }}>Password</span>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-3" style={{ borderColor: "#1a2d4a", background: "#061020" }}>
                  <Lock className="h-4 w-4" style={{ color: "#4a6fa5" }} />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#4a6fa5]"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-[#e2e8f0] transition hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00b4d8,#0077b6)", boxShadow: "0 0 22px rgba(0,180,216,0.35)" }}
              >
                {loading ? "Signing in..." : "Login"}
              </button>

              {error && <p className="text-center text-sm text-[#ef4444]">{error}</p>}
            </form>

            <p className="mt-5 text-center text-sm" style={{ color: "#4a6fa5" }}>
              New to MedAI?{" "}
              <Link href="/register" className="font-semibold text-[#00b4d8] hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
