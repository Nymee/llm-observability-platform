"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardStats {
  total_requests: number;
  success_count: number;
  error_count: number;
  cancelled_count: number;
  avg_latency_ms: number;
  total_tokens: number;
}

interface LatencyPoint {
  hour: string;
  avg_latency_ms: number;
  request_count: number;
}

interface ErrorRatePoint {
  hour: string;
  error_rate: number;
}

interface ProviderBreakdown {
  provider: string;
  request_count: number;
  avg_latency_ms: number;
  total_tokens: number;
}

interface DashboardData {
  stats: DashboardStats;
  latency: LatencyPoint[];
  errorRate: ErrorRatePoint[];
  providers: ProviderBreakdown[];
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const latencyPoints = (data?.latency ?? []).map((p) => ({
    ...p,
    hour: formatHour(p.hour),
  }));

  const errorPoints = (data?.errorRate ?? []).map((p) => ({
    ...p,
    hour: formatHour(p.hour),
    error_pct: +(p.error_rate * 100).toFixed(1),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">LLM Observability</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/chat" className="text-gray-500 hover:text-gray-900">Chat</Link>
          <Link href="/dashboard" className="text-indigo-600 font-medium">Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading && (
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Overview (all time)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Total Requests" value={data.stats.total_requests} />
                <StatCard label="Success" value={data.stats.success_count} />
                <StatCard label="Errors" value={data.stats.error_count} />
                <StatCard label="Cancelled" value={data.stats.cancelled_count} />
                <StatCard
                  label="Avg Latency"
                  value={`${data.stats.avg_latency_ms} ms`}
                />
                <StatCard
                  label="Total Tokens"
                  value={data.stats.total_tokens.toLocaleString()}
                />
              </div>
            </section>

            {/* Latency chart */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Avg Latency — last 24 h
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {latencyPoints.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={latencyPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis unit=" ms" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v} ms`, "Avg latency"]} />
                      <Line
                        type="monotone"
                        dataKey="avg_latency_ms"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        name="Avg latency"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Throughput chart */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Throughput (requests/hr) — last 24 h
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {latencyPoints.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={latencyPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Requests"]} />
                      <Bar dataKey="request_count" fill="#6366f1" name="Requests" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Error rate chart */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Error Rate — last 24 h
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {errorPoints.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={errorPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Error rate"]} />
                      <Line
                        type="monotone"
                        dataKey="error_pct"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name="Error rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Provider breakdown */}
            {data.providers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Requests by Provider
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.providers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="provider" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="request_count" fill="#6366f1" name="Requests" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
