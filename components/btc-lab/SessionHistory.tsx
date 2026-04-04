"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SessionMeta, Session } from "@/lib/btc-lab-types";
import BetCard from "./BetCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SessionCard({ meta }: { meta: SessionMeta }) {
  const [open, setOpen] = useState(false);
  const { data: full } = useSWR<Session>(
    open ? `/api/btc-lab/sessions/${meta.id}` : null,
    fetcher
  );

  const outcomeColor =
    meta.resolvedOutcome === "UP"
      ? "text-emerald-400"
      : meta.resolvedOutcome === "DOWN"
      ? "text-red-400"
      : "text-zinc-500";
  const pnlColor = meta.totalPnl >= 0 ? "text-emerald-400" : "text-red-400";

  // Parse time range from question
  const timeRange = meta.question.replace(/^.*?-\s*/, "").replace(/ ET$/, "");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-xs text-zinc-500">{open ? "v" : ">"}</span>
        <span className="flex-1 text-sm text-zinc-300 truncate">
          {timeRange}
        </span>
        {meta.targetPrice && (
          <span className="text-xs text-zinc-500">
            T: ${meta.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        )}
        {meta.resolvedOutcome && (
          <span className={`text-xs font-bold ${outcomeColor}`}>
            {meta.resolvedOutcome}
          </span>
        )}
        {meta.betCount > 0 && (
          <>
            <span className="text-xs text-zinc-500">
              {meta.betCount} bet{meta.betCount > 1 ? "s" : ""}
            </span>
            <span className={`text-xs font-bold ${pnlColor}`}>
              {meta.totalPnl >= 0 ? "+" : ""}${meta.totalPnl.toFixed(0)}
            </span>
          </>
        )}
        {!meta.completedAt && (
          <span className="rounded-full bg-yellow-900/50 px-1.5 py-0.5 text-[9px] text-yellow-400">
            ACTIVE
          </span>
        )}
      </button>

      {open && full && (
        <div className="border-t border-zinc-800 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-zinc-500">Ticks: </span>
              <span className="text-zinc-300">{full.ticks?.length || 0}</span>
            </div>
            <div>
              <span className="text-zinc-500">Bets: </span>
              <span className="text-zinc-300">{full.bets?.length || 0}</span>
            </div>
            <div>
              <span className="text-zinc-500">Outcome: </span>
              <span className={outcomeColor}>
                {meta.resolvedOutcome || "pending"}
              </span>
            </div>
          </div>

          {full.bets && full.bets.length > 0 && (
            <div className="space-y-1">
              {full.bets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionHistory({
  sessions,
}: {
  sessions: SessionMeta[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="text-center text-sm text-zinc-500 py-8">
        No sessions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <SessionCard key={s.id} meta={s} />
      ))}
    </div>
  );
}
