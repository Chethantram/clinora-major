"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { fetchApi } from "@/lib/backend-api";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetchApi("/api/auth/session")
      .then(() => {
        if (active) setIsAuthenticated(true);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        if (pathname !== "/") router.replace("/auth/login");
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (isAuthenticated === null) {
    if (pathname === "/") return <>{children}</>;
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking your secure session...</div>;
  }

  if (pathname === "/" && !isAuthenticated) return <>{children}</>;
  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_90%_6%,hsl(var(--accent)/0.18),transparent_28%),linear-gradient(160deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]" />
      <Sidebar />
      <div className="relative ml-64 flex min-h-screen flex-col">
        <Header />
        <main className="relative z-10 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}