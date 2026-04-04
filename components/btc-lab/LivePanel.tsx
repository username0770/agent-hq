"use client";

import { useState, useEffect } from "react";
import type { Session } from "@/lib/btc-lab-types";
import OrderBook from "./OrderBook";
import BetCard from "./BetCard";

function Timer({ endDate }: { endDate: string }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    function calc() {
      const end = new Date(endDate).getTime();
      setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    }
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [endDate]);

  const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - left / 300))));
  const filled = Math.round(20 * pct / 100);
  const bar = "#".repeat(filled) + "-".repeat(20 - filled);
  const m = Math.floor(left / 60);
  const s = left % 60;
  const col = left < 60 ? "text-red-400" : left < 120 ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-mono font-bold ${col}`}>
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs text-zinc-600">[{bar}]</span>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}

interface LivePanelProps {
  session: Session | null;
  manualTarget: number | null;
  onSetManualTarget: (price: number | null) => void;
}

export default function LivePanel({
  session,
  manualTarget,
  onSetManualTarget,
}: LivePanelProps) {
  const [inputValue, setInputValue] = useState("");

  if (!session) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
        No active session. Start price_lag_test.py to begin.
      </div>
    );
  }

  const lastTick = session.ticks?.[session.ticks.length - 1];
  const lastOb = session.orderBook?.[session.orderBook.length - 1];
  const bids = lastOb?.bids || [];
  const asks = lastOb?.asks || [];
  const spread = lastOb?.spread || 0;

  const effectiveTarget = manualTarget ?? session.targetPrice;
  const isManual = manualTarget !== null;
  const move = lastTick && effectiveTarget
    ? lastTick.cexMedian! - effectiveTarget
    : null;
  const movePct = move && effectiveTarget
    ? (move / effectiveTarget) * 100
    : null;

  function handleSetTarget() {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val > 0) {
      onSetManualTarget(val);
      setInputValue("");
    }
  }

  return (
    <div className="rounded-xl border border-yellow-800/50 bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">
            {session.question}
          </h3>
          <Timer endDate={session.endDate} />
        </div>
        <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 animate-pulse">
          LIVE
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {/* Target Price with manual override */}
          <div className="rounded-lg bg-zinc-950 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-zinc-500">Target Price</div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                isManual
                  ? "bg-yellow-900/50 text-yellow-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}>
                {isManual ? "manual" : session.targetSource || "auto"}
              </span>
            </div>
            <div className="text-lg font-bold text-cyan-400">
              {effectiveTarget
                ? `$${effectiveTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : "not set"}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetTarget()}
                placeholder="Override target..."
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
              />
              <button
                onClick={handleSetTarget}
                className="rounded bg-yellow-600 px-2 py-1 text-xs font-medium text-white hover:bg-yellow-500"
              >
                Set
              </button>
              {isManual && (
                <button
                  onClick={() => onSetManualTarget(null)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Current prices */}
          {lastTick && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">CEX Median</div>
                <div className="text-sm font-bold text-zinc-200">
                  ${lastTick.cexMedian?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "-"}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">Binance</div>
                <div className="text-sm font-bold text-zinc-200">
                  ${lastTick.binance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "-"}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">PM UP Price</div>
                <div className="text-sm font-bold text-yellow-400">
                  {lastTick.pmUpPrice ? `${(lastTick.pmUpPrice * 100).toFixed(0)}c` : "-"}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">Chainlink</div>
                <div className="text-sm font-bold text-zinc-200">
                  ${lastTick.chainlink?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "-"}
                </div>
              </div>
            </div>
          )}

          {/* Movement */}
          {move !== null && (
            <div className={`rounded-lg p-3 ${move >= 0 ? "bg-emerald-950/30 border border-emerald-800/30" : "bg-red-950/30 border border-red-800/30"}`}>
              <div className="text-xs text-zinc-500 mb-1">Move from Target</div>
              <div className={`text-lg font-bold ${move >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {move >= 0 ? "^" : "v"} ${Math.abs(move).toFixed(2)} ({movePct!.toFixed(3)}%)
              </div>
              <div className={`text-sm font-bold ${move >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {move >= 0 ? "UP" : "DOWN"}
              </div>
            </div>
          )}
        </div>

        {/* Order Book */}
        <div>
          {bids.length > 0 || asks.length > 0 ? (
            <OrderBook bids={bids} asks={asks} spread={spread} />
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center text-xs text-zinc-600">
              Waiting for order book data...
            </div>
          )}
        </div>
      </div>

      {/* Bets */}
      {session.bets.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
            Paper Bets ({session.bets.length})
          </h4>
          <div className="space-y-2">
            {session.bets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
