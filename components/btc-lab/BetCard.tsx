"use client";

import type { PaperBet } from "@/lib/btc-lab-types";

export default function BetCard({ bet }: { bet: PaperBet }) {
  const isUp = bet.side === "UP";
  const badge =
    bet.outcome === "WIN"
      ? "bg-emerald-900/50 text-emerald-400"
      : bet.outcome === "LOSS"
      ? "bg-red-900/50 text-red-400"
      : "bg-zinc-800 text-zinc-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              isUp
                ? "bg-emerald-900/50 text-emerald-400"
                : "bg-red-900/50 text-red-400"
            }`}
          >
            {bet.side}
          </span>
          <span className="text-zinc-300">
            ${bet.amount} @ {(bet.price * 100).toFixed(0)}c
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>
          {bet.outcome}
        </span>
      </div>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span>Edge: {(bet.edge * 100).toFixed(1)}%</span>
        <span>Fair: {(bet.fairProbability * 100).toFixed(0)}%</span>
        <span>Fee: ${bet.fee.toFixed(2)}</span>
        <span>{bet.secondsLeftAtBet}s left</span>
      </div>

      {bet.pnl !== null && (
        <div className="mt-1 text-xs font-bold">
          <span className={bet.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
            P&L: {bet.pnl >= 0 ? "+" : ""}${bet.pnl.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
