"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Activity, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Patient {
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  diagnosis?: string[];
  allergies?: string[];
  status?: "stable" | "critical" | "monitoring" | string;
  lastVisit?: string | null;
}

interface PatientCardProps {
  patient: Patient;
}

const statusConfig = {
  stable: {
    label: "Stable",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  monitoring: {
    label: "Monitoring",
    icon: Activity,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function PatientCard({ patient }: PatientCardProps) {
  const status = statusConfig[patient.status as keyof typeof statusConfig] || statusConfig.stable;
  const StatusIcon = status.icon;

  return (
    <Link href={`/patients/${patient.patient_id}`}>
      <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {patient.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{patient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {patient.age} yrs • {patient.gender} • {patient.patient_id}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn("gap-1", status.className)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(patient.diagnosis || []).map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">
                {d}
              </Badge>
            ))}
          </div>

          {(patient.allergies || []).length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive">
                Allergies: {(patient.allergies || []).join(", ")}
              </span>
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Last visit: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }) : "Not recorded"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
