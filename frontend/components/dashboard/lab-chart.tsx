"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/backend-api";

interface LabChartProps {
  patientId: string;
  testName: string;
  title?: string;
}

export function LabChart({ patientId, testName, title }: LabChartProps) {
  const [data, setData] = useState<Array<{ date: string; value: number; normalMin: number; normalMax: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchApi<{ labResults?: Array<{ patient_id: string; test: string; value: number; date: string; normalRange?: { min: number; max: number } }> }>("/api/dashboard/data")
      .then((response) => {
        if (!active) return;
        const rows = (response.labResults || [])
          .filter((row) => row.patient_id === patientId && row.test.toLowerCase() === testName.toLowerCase())
          .map((row) => ({
            date: row.date,
            value: Number(row.value),
            normalMin: row.normalRange?.min ?? 0,
            normalMax: row.normalRange?.max ?? 0,
          }))
          .filter((row) => Number.isFinite(row.value))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setData(rows);
      })
      .catch(() => {
        if (active) setData([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId, testName]);

  if (loading || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || testName}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          {loading ? "Loading lab data..." : "No lab data available"}
        </CardContent>
      </Card>
    );
  }

  const normalMin = data[0].normalMin;
  const normalMax = data[0].normalMax;
  const maxValue = Math.max(...data.map((d) => d.value), normalMax) * 1.1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title || testName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="normalRange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                  })
                }
              />
              <YAxis
                domain={[0, maxValue]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
                labelFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                }
              />
              {/* Normal range area */}
              <ReferenceLine
                y={normalMax}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={normalMin}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{
                  fill: "hsl(var(--chart-1))",
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--chart-1))",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Normal range: {normalMin} - {normalMax}
          </span>
          <span className="font-medium text-foreground">
            Latest: {data[data.length - 1].value}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
