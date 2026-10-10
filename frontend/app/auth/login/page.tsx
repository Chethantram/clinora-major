"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${BACKEND_URL}/api/auth/session`, { credentials: "include" })
      .then((response) => {
        if (active && response.ok) router.replace("/dashboard");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "doctor" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to sign in");
      localStorage.setItem("medai_user", JSON.stringify(result.user));
      localStorage.setItem("medai_role", "doctor");
      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Clinician access"
      title="Welcome back."
      description="Sign in to open your patient workspace and clinical insights."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="doctor@hospital.com"
          />
        </label>
        <label className="auth-field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Signing in..." : <>Sign in <ArrowRight size={15} /></>}
        </button>
      </form>
      <p className="auth-switch">
        New to MedAI Pro? <Link href="/auth/register">Create a clinician account</Link>
      </p>
    </AuthFrame>
  );
}
