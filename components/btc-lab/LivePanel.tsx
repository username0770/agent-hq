"use client";

import { useState, useEffect, useMemo } from "react";
import type { Session } from "@/lib/btc-lab-types";
import { PM_FEE_RATE, calcPmFee } from "@/lib/btc-lab-types";
import BetCard from "./BetCard";

function Timer({ endDate }: { endDate: string }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    function calc() {
      setLeft(Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000)));
    }
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [endDate]);

  const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - left / 300))));
  const filled = Math.round(20 * pct / 100);
  const bar = "#".repeat(filled) + "-".repeat(20 - filled);
  const col = left < 60 ? "text-red-400" : left < 120 ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-mono font-bold ${col}`}>
        {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs text-zinc-600">[{bar}]</span>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}

function fairProbability(btcNow: number, target: number, secondsLeft: number, vol = 15) {
  if (!target || !btcNow || secondsLeft <= 0) return { up: 0.5, down: 0.5 };
  const T = secondsLeft / 60;
  const std = vol * Math.sqrt(T);
  if (std === 0) return { up: 0.5, down: 0.5 };
  const d = (target - btcNow) / std;
  const phi = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
  const up = 1 - phi(d);
  return { up, down: 1 - up };
}

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

interface LivePanelProps {
  session: Session | null;
  manualTarget: number | null;
  onSetManualTarget: (price: number | null) => void;
  onBetUpdate?: () => void;
}

export default function LivePanel({ session, manualTarget, onSetManualTarget, onBetUpdate }: LivePanelProps) {
  const [inputValue, setInputValue] = useState("");

  if (!session) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
        No active session. Start price_lag_test.py to begin.
      </div>
    );
  }

  const lastTick = session.ticks?.[session.ticks.length - 1];
  const effectiveTarget = manualTarget ?? session.targetPrice;
  const isManual = manualTarget !== null;

  const move = lastTick && effectiveTarget ? (lastTick.cexMedian || lastTick.binance || 0) - effectiveTarget : null;
  const movePct = move && effectiveTarget ? (move / effectiveTarget) * 100 : null;

  // Market prices
  const upPrice = lastTick?.pmUpPrice || 0.5;
  const downPrice = 1 - upPrice;

  // Fair value
  const ref = lastTick?.chainlink || lastTick?.cexMedian || lastTick?.binance || 0;
  const secondsLeft = lastTick?.secondsLeft || 0;
  const fv = effectiveTarget && ref ? fairProbability(ref, effectiveTarget, secondsLeft) : null;

  // Fees
  const feeUp = calcPmFee(1, upPrice);
  const feeDown = calcPmFee(1, downPrice);

  // Edges
  const edgeUp = fv ? fv.up - upPrice : 0;
  const edgeDown = fv ? fv.down - downPrice : 0;
  const edgeUpAf = edgeUp - feeUp;
  const edgeDownAf = edgeDown - feeDown;

  // Spreads
  const bnCl = lastTick?.binance && lastTick?.chainlink ? lastTick.binance - lastTick.chainlink : null;
  const medCl = lastTick?.cexMedian && lastTick?.chainlink ? lastTick.cexMedian - lastTick.chainlink : null;

  function handleSetTarget() {
    const cleaned = inputValue.replace(/[$,\s]/g, "");
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0) {
      onSetManualTarget(val);
      setInputValue("");
    }
  }

  const edgeColor = (e: number) =>
    e > 0.03 ? "text-emerald-400" : e < -0.03 ? "text-red-400" : "text-yellow-400";

  return (
    <div className="rounded-xl border border-yellow-800/50 bg-zinc-900 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">{session.question}</h3>
          <Timer endDate={session.endDate} />
        </div>
        <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 animate-pulse">
          LIVE
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Target + Prices + Movement */}
        <div className="space-y-3">
          {/* Target */}
          <div className="rounded-lg bg-zinc-950 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-zinc-500">Target Price</div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                isManual ? "bg-yellow-900/50 text-yellow-400" : "bg-zinc-800 text-zinc-500"
              }`}>
                {isManual ? "manual" : session.targetSource || "auto"}
              </span>
            </div>
            <div className="text-lg font-bold text-cyan-400">
              {effectiveTarget ? `$${effectiveTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "not set"}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetTarget()}
                placeholder="Override target..."
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
              />
              <button onClick={handleSetTarget} className="rounded bg-yellow-600 px-2 py-1 text-xs font-medium text-white hover:bg-yellow-500">Set</button>
              {isManual && (
                <button onClick={() => onSetManualTarget(null)} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200">Reset</button>
              )}
            </div>
          </div>

          {/* Price cards */}
          {lastTick && (
            <div className="grid grid-cols-2 gap-2">
              <PriceCard label="CEX Median" value={lastTick.cexMedian} />
              <PriceCard label="Binance" value={lastTick.binance} />
              <PriceCard label="Chainlink" value={lastTick.chainlink} />
              <div className="rounded-lg bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">PM UP Price</div>
                <div className="text-sm font-bold text-yellow-400">
                  {upPrice ? `${(upPrice * 100).toFixed(0)}c` : "-"}
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
              {bnCl !== null && (
                <div className="text-xs text-zinc-500 mt-1">
                  Spread Bn-CL: ${bnCl.toFixed(2)}
                  {medCl !== null && ` | Med-CL: $${medCl.toFixed(2)}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: UP vs DOWN model comparison */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-3">Model vs Market</h4>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th className="text-left pb-2 font-medium"></th>
                <th className="text-right pb-2 font-medium text-emerald-500">UP</th>
                <th className="text-right pb-2 font-medium text-red-500">DOWN</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="text-zinc-500 py-1">Market</td>
                <td className={`text-right font-bold ${upPrice > 0.5 ? "text-emerald-400" : "text-zinc-300"}`}>
                  {(upPrice * 100).toFixed(0)}%
                </td>
                <td className={`text-right font-bold ${downPrice > 0.5 ? "text-red-400" : "text-zinc-300"}`}>
                  {(downPrice * 100).toFixed(0)}%
                </td>
              </tr>
              {fv && (
                <>
                  <tr>
                    <td className="text-zinc-500 py-1">Fair value</td>
                    <td className="text-right font-bold text-cyan-400">{(fv.up * 100).toFixed(1)}%</td>
                    <td className="text-right font-bold text-cyan-400">{(fv.down * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="text-zinc-500 py-1">Edge</td>
                    <td className={`text-right font-bold ${edgeColor(edgeUp)}`}>{(edgeUp * 100).toFixed(1)}%</td>
                    <td className={`text-right font-bold ${edgeColor(edgeDown)}`}>{(edgeDown * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="text-zinc-500 py-1">After fee</td>
                    <td className={`text-right font-bold ${edgeColor(edgeUpAf)}`}>{(edgeUpAf * 100).toFixed(1)}%</td>
                    <td className={`text-right font-bold ${edgeColor(edgeDownAf)}`}>{(edgeDownAf * 100).toFixed(1)}%</td>
                  </tr>
                </>
              )}
              <tr className="border-t border-zinc-800">
                <td className="text-zinc-600 py-1 text-xs">Fee</td>
                <td className="text-right text-zinc-600 text-xs">${feeUp.toFixed(4)}</td>
                <td className="text-right text-zinc-600 text-xs">${feeDown.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signal */}
          {fv && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              {edgeUpAf > 0.04 ? (
                <div className="text-sm font-bold text-emerald-400">
                  &gt;&gt; BET UP! (edge {(edgeUpAf * 100).toFixed(1)}% after fee)
                </div>
              ) : edgeDownAf > 0.04 ? (
                <div className="text-sm font-bold text-emerald-400">
                  &gt;&gt; BET DOWN! (edge {(edgeDownAf * 100).toFixed(1)}% after fee)
                </div>
              ) : edgeUpAf > 0 ? (
                <div className="text-sm text-yellow-400">
                  ~ slight UP edge ({(edgeUpAf * 100).toFixed(1)}%)
                </div>
              ) : edgeDownAf > 0 ? (
                <div className="text-sm text-yellow-400">
                  ~ slight DOWN edge ({(edgeDownAf * 100).toFixed(1)}%)
                </div>
              ) : (
                <div className="text-sm text-zinc-500">No edge</div>
              )}
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
              <BetCard key={bet.id} bet={bet} sessionId={session.id} onUpdate={onBetUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-lg bg-zinc-950 p-2">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-sm font-bold text-zinc-200">
        {value ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
      </div>
    </div>
  );
}
