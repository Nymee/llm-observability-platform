import { NextResponse } from "next/server";
import {
  getDashboardStats,
  getLatencyOverTime,
  getErrorRate,
  getProviderBreakdown,
} from "@/repositories/inference";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, latency, errorRate, providers] = await Promise.all([
      getDashboardStats(),
      getLatencyOverTime(),
      getErrorRate(),
      getProviderBreakdown(),
    ]);
    return NextResponse.json({ stats, latency, errorRate, providers });
  } catch (err) {
    console.error("[dashboard] query failed:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
