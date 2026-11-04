"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTL } from "@/lib/money";

interface ChartDataPoint {
  day: string;
  count: number;
}

interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

interface TodayAnalyticsChartsProps {
  weeklyData: ChartDataPoint[];
  serviceDistribution: ServiceDistribution[];
  todayCollected: number;
  unpaidTotal: number;
}

const COLORS = ["#ffb020", "#38bdf8", "#34d399", "#a78bfa", "#f43f5e", "#fb923c"];

export function TodayAnalyticsCharts({
  weeklyData,
  serviceDistribution,
  todayCollected,
  unpaidTotal,
}: TodayAnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<"trend" | "services">("trend");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Haftalık Giriş Grafiği */}
      <Card className="border-line bg-surface/90 shadow-md">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Haftalık Kabul
            </CardTitle>
            <p className="text-xs text-muted mt-0.5">Son 7 günde gelen hayvan sayısı</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-accent-strong uppercase tracking-wider">7 Günlük Toplam</span>
            <p className="text-lg font-bold font-display text-ink">
              {weeklyData.reduce((acc, d) => acc + d.count, 0)} Hayvan
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffb020" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ffb020" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-line bg-surface p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-ink">{payload[0].payload.day}</p>
                          <p className="text-accent-strong font-bold mt-0.5">
                            {payload[0].value} kabul
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#ffb020"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hizmet Dağılımı ve Günlük Ciro Özeti */}
      <Card className="border-line bg-surface/90 shadow-md flex flex-col justify-between">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ready" />
              Aktif Hizmet Dağılımı
            </CardTitle>
            <p className="text-xs text-muted mt-0.5">İş emirlerindeki hizmetler</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-ready uppercase tracking-wider">Bugünkü Tahsilat</span>
            <p className="text-base font-bold font-display text-ready">
              {formatTL(todayCollected)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-center">
          {serviceDistribution.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-xs text-muted">
              Henüz aktif işlem bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-2 items-center gap-2">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl border border-line bg-surface p-2 shadow-xl text-xs">
                              <p className="font-semibold text-ink">{payload[0].name}</p>
                              <p className="text-accent-strong font-bold">
                                {payload[0].value} İşlem
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs">
                {serviceDistribution.slice(0, 4).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted truncate max-w-[100px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.color || COLORS[idx % COLORS.length] }}
                      />
                      {s.name}
                    </span>
                    <span className="font-semibold tabular-nums text-ink">{s.value}</span>
                  </div>
                ))}
                {unpaidTotal > 0 && (
                  <div className="mt-2 pt-2 border-t border-line flex justify-between text-[11px]">
                    <span className="text-muted">Kalan Alacak:</span>
                    <span className="font-bold text-danger tabular-nums">{formatTL(unpaidTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
