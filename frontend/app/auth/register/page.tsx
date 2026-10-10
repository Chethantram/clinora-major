"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000";

export default function DoctorRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
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
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, department, email, phone, password, registrationCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to create your account");
      localStorage.setItem("medai_user", JSON.stringify(result.user));
      localStorage.setItem("medai_role", "doctor");
      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Clinician onboarding"
      title="Create your account."
      description="Use the registration code provided by your hospital administrator."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          Full name
          <input
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dr. Asha Verma"
          />
        </label>
        <label className="auth-field">
          Department
          <input
            type="text"
            autoComplete="organization-title"
            maxLength={120}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="General medicine"
          />
        </label>
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
          Phone number <span>(optional)</span>
          <input
            type="tel"
            autoComplete="tel"
            maxLength={32}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 555 010 1234"
          />
        </label>
        <label className="auth-field">
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={256}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 12 characters"
          />
        </label>
        <label className="auth-field">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={256}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Enter your password again"
          />
        </label>
        <label className="auth-field">
          Doctor registration code
          <input
            type="password"
            autoComplete="off"
            required
            value={registrationCode}
            onChange={(event) => setRegistrationCode(event.target.value)}
            placeholder="Provided by your administrator"
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating account..." : <>Create account <ArrowRight size={15} /></>}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
