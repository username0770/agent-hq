"use client";

import type { PaperBet } from "@/lib/btc-lab-types";

interface BetCardProps {
  bet: PaperBet;
  sessionId?: string;
  onUpdate?: () => void;
}

export default function BetCard({ bet, sessionId, onUpdate }: BetCardProps) {
  const isUp = bet.side === "UP";
  const badge =
    bet.outcome === "WIN"
      ? "bg-emerald-900/50 text-emerald-400"
      : bet.outcome === "LOSS"
      ? "bg-red-900/50 text-red-400"
      : "bg-zinc-800 text-zinc-400";

  async function handleDelete() {
    if (!sessionId) return;
    await fetch(`/api/btc-lab/sessions/${sessionId}/bets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", betId: bet.id }),
    });
    onUpdate?.();
  }

  async function handleSettle(outcome: "UP" | "DOWN") {
    if (!sessionId) return;
    await fetch(`/api/btc-lab/sessions/${sessionId}/bets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle", betId: bet.id, outcome }),
    });
    onUpdate?.();
  }

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
          <span className={`text-[9px] px-1 py-0.5 rounded ${
            bet.targetSource === "manual"
              ? "bg-yellow-900/50 text-yellow-400"
              : "bg-zinc-800 text-zinc-500"
          }`}>
            {bet.targetSource === "manual" ? "manual" : "auto"}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>
          {bet.outcome}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
        <span>Edge: {(bet.edge * 100).toFixed(1)}%</span>
        <span>Fair: {(bet.fairProbability * 100).toFixed(0)}%</span>
        <span>Fee: ${bet.fee.toFixed(2)}</span>
        <span>Timer: {bet.timerAtBet || `${bet.secondsLeftAtBet}s`}</span>
      </div>

      {bet.pnl !== null && (
        <div className="mt-1 text-xs font-bold">
          <span className={bet.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
            P&L: {bet.pnl >= 0 ? "+" : ""}${bet.pnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* Actions */}
      {sessionId && (
        <div className="mt-2 flex gap-1.5">
          {bet.outcome === "PENDING" && (
            <>
              <button
                onClick={() => handleSettle("UP")}
                className="rounded border border-emerald-800/50 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-900/30"
              >
                Settle UP
              </button>
              <button
                onClick={() => handleSettle("DOWN")}
                className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30"
              >
                Settle DOWN
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-red-400 hover:border-red-800/50 ml-auto"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
