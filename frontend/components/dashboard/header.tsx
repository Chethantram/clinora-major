"use client";

import { Bell, Search, Calendar, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/backend-api";
import Link from "next/link";

type Alert = {
  id: string;
  patient_id?: string;
  severity?: string;
  message: string;
};

export function Header() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    fetchApi<{ alerts?: Alert[] }>("/api/dashboard/data")
      .then((data) => {
        if (active) setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      })
      .catch(() => {
        if (active) setAlerts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("alerts-read-state-v1");
      if (saved) setReadAlertIds(JSON.parse(saved));
    } catch {
      setReadAlertIds({});
    }

    const sync = () => {
      try {
        const saved = localStorage.getItem("alerts-read-state-v1");
        if (saved) setReadAlertIds(JSON.parse(saved));
      } catch {
        setReadAlertIds({});
      }
    };

    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const criticalAlerts = alerts.filter((a) => a.severity === "high");
  const unreadAlerts = criticalAlerts.filter((alert) => !readAlertIds[alert.id]).length;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-card/70 px-6 backdrop-blur-xl">
      <div className="relative w-80">
        
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-4 py-2 md:flex">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{today}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl border border-border/70 bg-muted/50 hover:bg-muted"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadAlerts > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] text-primary-foreground shadow-sm">
                  {unreadAlerts}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Critical Alerts</span>
              <Badge variant="destructive" className="text-xs">
                {unreadAlerts} new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {criticalAlerts.filter((alert) => !readAlertIds[alert.id]).slice(0, 3).map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="cursor-pointer flex-col items-start gap-1.5 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {alert.message}
                </span>
                {alert.patient_id && (
                  <span className="text-xs text-muted-foreground">
                    Patient ID: {alert.patient_id}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            {criticalAlerts.filter((alert) => !readAlertIds[alert.id]).length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">No unread critical alerts</div>
            )}
            <DropdownMenuSeparator />
            <Link href="/alerts" className="block px-3 py-2 text-center text-sm font-medium text-foreground">
              View all alerts
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

     
      </div>
    </header>
  );
}
