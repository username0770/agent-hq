"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bet = Record<string, any>;

interface BetCardProps {
  bet: Bet;
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
            {(() => {
              const usdc = Number(bet.amount ?? bet.amountUSDC ?? 0);
              const p = Number(bet.price ?? bet.intendedPrice ?? 0);
              const sh = Number(bet.sharesReceived ?? 0);
              return `$${usdc.toFixed(2)} @ ${(p * 100).toFixed(0)}c${sh > 0 ? ` (${sh.toFixed(1)} sh)` : ""}`;
            })()}
          </span>
          <span className={`text-[9px] px-1 py-0.5 rounded ${
            bet.targetSource === "manual"
              ? "bg-yellow-900/50 text-yellow-400"
              : "bg-zinc-800 text-zinc-500"
          }`}>
            {bet.targetSource === "manual" ? "manual" : "auto"}
          </span>
          {bet.strategyName && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/50 text-purple-400">
              {bet.strategyName}
            </span>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>
          {bet.outcome}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
        <span>Edge: {((bet.edge ?? 0) * 100).toFixed(1)}%</span>
        <span>Fair: {((bet.fairProbability ?? 0.5) * 100).toFixed(0)}%</span>
        <span>Fee: ${(bet.fee ?? bet.feeCalculated ?? 0).toFixed(2)}</span>
        <span>Timer: {bet.timerAtBet || (bet.secondsLeftAtBet != null ? `${Math.floor(bet.secondsLeftAtBet/60)}:${String(bet.secondsLeftAtBet%60).padStart(2,"0")}` : "-")}</span>
      </div>

      {(bet.pnl != null || bet.netPnl != null || bet.net_pnl != null) && (() => {
        const p = Number(bet.pnl ?? bet.netPnl ?? bet.net_pnl ?? 0);
        return (
        <div className="mt-1 text-xs font-bold">
          <span className={p >= 0 ? "text-emerald-400" : "text-red-400"}>
            P&L: {p >= 0 ? "+" : ""}${p.toFixed(2)}
          </span>
        </div>
      ); })()}

      {/* Actions — only for PENDING */}
      {sessionId && bet.outcome === "PENDING" && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => handleSettle("UP")}
            className="rounded border border-emerald-800/50 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-900/30">
            Settle UP
          </button>
          <button onClick={() => handleSettle("DOWN")}
            className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30">
            Settle DOWN
          </button>
          <button onClick={handleDelete}
            className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-red-400 ml-auto">
            Delete
          </button>
        </div>
      )}
      {/* Settled info */}
      {bet.outcome && bet.outcome !== "PENDING" && (
        <div className="mt-1 text-[10px] text-zinc-600">
          Settled {bet.resolvedAt ? new Date(bet.resolvedAt).toLocaleString() : ""}
        </div>
      )}
    </div>
  );
}
