"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Session, Tick } from "@/lib/btc-lab-types";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

interface SessionChartProps {
  sessions: Session[];
  height?: number;
}

export default function SessionChart({ sessions, height = 300 }: SessionChartProps) {
  const chartData = useMemo(() => {
    const allTicks: (Tick & { sessionId: string })[] = [];
    for (const s of sessions) {
      for (const t of s.ticks || []) {
        allTicks.push({ ...t, sessionId: s.id });
      }
    }
    allTicks.sort((a, b) => a.ts - b.ts);

    // Downsample if too many points
    const step = Math.max(1, Math.floor(allTicks.length / 500));
    const sampled = allTicks.filter((_, i) => i % step === 0);

    const labels = sampled.map((t) =>
      new Date(t.ts).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      })
    );

    // Bet markers
    const allBets = sessions.flatMap((s) =>
      (s.bets || []).map((b) => ({ ...b, sessionId: s.id }))
    );

    return {
      labels,
      datasets: [
        {
          label: "CEX Median",
          data: sampled.map((t) => t.cexMedian),
          borderColor: "#10b981",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.1,
        },
        {
          label: "Chainlink",
          data: sampled.map((t) => t.chainlink),
          borderColor: "#ef4444",
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [4, 3],
          tension: 0.1,
        },
        {
          label: "PM UP Price",
          data: sampled.map((t) => t.pmUpPrice),
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: "y1",
        },
        // Target prices as horizontal segments
        ...sessions
          .filter((s) => s.targetPrice)
          .map((s, i) => ({
            label: i === 0 ? "Target" : "",
            data: sampled.map((t) =>
              t.sessionId === s.id ? s.targetPrice : null
            ),
            borderColor: "#60a5fa",
            borderWidth: 1,
            borderDash: [8, 4],
            pointRadius: 0,
            spanGaps: false,
          })),
      ],
    };
  }, [sessions]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    spanGaps: true,
    plugins: {
      legend: { labels: { color: "#a1a1aa", font: { size: 11 } } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { color: "#52525b", maxTicksLimit: 12, font: { size: 10 } },
        grid: { color: "#27272a" },
      },
      y: {
        ticks: { color: "#52525b", font: { size: 10 } },
        grid: { color: "#27272a" },
      },
      y1: {
        position: "right" as const,
        min: 0,
        max: 1,
        ticks: {
          color: "#f59e0b",
          font: { size: 10 },
          callback: (v: number | string) => `${Number(v) * 100}%`,
        },
        grid: { display: false },
      },
    },
  };

  if (sessions.length === 0 || chartData.labels.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500 text-sm">
        No tick data yet. Chart will appear when sessions have data.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
