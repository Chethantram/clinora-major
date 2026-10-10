"use client";

import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";

type Patient = {
  patient_id: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  diagnosis?: string[];
  status?: string;
  lastVisit?: string | null;
};

function getStatusClass(status?: string) {
  const normalized = (status || "stable").toLowerCase();
  if (normalized.includes("critical") || normalized === "high") return "critical";
  if (normalized.includes("monitor") || normalized.includes("medium")) return "monitoring";
  return "stable";
}

interface Props {
  patients: Patient[];
}

export default function PatientList({ patients }: Props) {
  return (
    <div>
      {patients.map((patient) => {
        const status = getStatusClass(patient.status);
        const initials = patient.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2);

        return (
          <Link key={patient.patient_id} href={`/patients/${patient.patient_id}`} className="db-patient-row">
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar style={{ width: 34, height: 34 }}>
                <AvatarImage src={`https://i.pravatar.cc/100?u=${patient.patient_id}`} />
                <AvatarFallback style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600 }}>{initials}</AvatarFallback>
              </Avatar>
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  border: "1.5px solid white",
                  background: status === "critical" ? "#ef4444" : status === "monitoring" ? "#f59e0b" : "#22c55e",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {patient.name}
              </p>
              <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1.5 }}>
                {patient.age ?? "-"} yrs · {patient.gender || "Unknown"} · {patient.diagnosis?.[0] || "No diagnosis"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span className={`db-status db-status-${status}`}>{status === "critical" ? "Critical" : status === "monitoring" ? "Monitoring" : "Stable"}</span>
              <ChevronRight style={{ width: 14, height: 14, color: "#cbd5e1" }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
