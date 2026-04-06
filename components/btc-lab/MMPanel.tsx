"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";

const LOCAL = "http://localhost:8765";
const localFetcher = (p: string) =>
  fetch(`${LOCAL}${p}`).then((r) => r.json()).catch(() => null);

interface MMStatus {
  enabled: boolean;
  strategy: string;
  running: boolean;
  pause_reason: string;
  active_orders: number;
  total_fills: number;
  rebates_est: number;
}

export function MMStatusBadge() {
  const { data } = useSWR<MMStatus>("/mm-status", localFetcher,
    { refreshInterval: 3000 });

  if (!data) return null;
  if (!data.enabled) {
    return <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">MM off</span>;
  }
  if (data.running) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
        MM: {data.strategy} | {data.active_orders}ord | {data.total_fills}fills | ~${data.rebates_est.toFixed(3)}
      </span>
    );
  }
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
      MM: paused {data.pause_reason?.slice(0, 20)}
    </span>
  );
}

export function AutoBetsToggle() {
  const { data } = useSWR("/control/status", localFetcher, { refreshInterval: 3000 });
  const enabled = data?.auto_bets?.enabled !== false;

  async function toggle() {
    await fetch(`${LOCAL}/control/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "set_auto_bets", enabled: !enabled }),
    });
    mutate("/control/status");
  }

  return (
    <button onClick={toggle}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        enabled
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
      }`}>
      Auto-bets: {enabled ? "ON" : "OFF"}
    </button>
  );
}

export function MMToggle() {
  const { data } = useSWR("/control/status", localFetcher, { refreshInterval: 3000 });
  const enabled = data?.mm_config?.enabled === true;

  async function toggle() {
    await fetch(`${LOCAL}/control/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "set_mm", enabled: !enabled }),
    });
    mutate("/control/status");
    mutate("/mm-status");
  }

  return (
    <button onClick={toggle}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        enabled
          ? "bg-cyan-600 text-white hover:bg-cyan-500"
          : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
      }`}>
      MM: {enabled ? "ON" : "OFF"}
    </button>
  );
}

export default function MMControlPanel() {
  const { data: ctrl } = useSWR("/control/status", localFetcher, { refreshInterval: 5000 });
  const { data: mmSt } = useSWR<MMStatus>("/mm-status", localFetcher, { refreshInterval: 3000 });

  const saved = ctrl?.mm_config || {};
  const [cfg, setCfg] = useState({
    enabled: false,
    strategy: "book",
    ladder_levels: 3,
    ladder_step_cents: 0.5,
    level_size: 30,
    offset_cents: 1.0,
    half_spread: 1.5,
    expiry_stop_sec: 30,
    prot_stale: true, stale_cents: 0.5, stale_age: 10,
    prot_thin: true, thin_depth: 50, thin_pause: 15, thin_spread: 3.0,
    prot_shift: true, shift_cents: 2.0,
    prot_volume: true, volume_mult: 3.0,
    inv_skew: true, inv_gamma: 0.005, inv_warn: 200, inv_crit: 400,
  });

  useEffect(() => {
    if (saved && Object.keys(saved).length > 0) {
      setCfg((prev) => ({ ...prev, ...saved }));
    }
  }, [JSON.stringify(saved)]);

  async function save() {
    await fetch(`${LOCAL}/control/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "update_mm_config", config: cfg }),
    });
    mutate("/control/status");
  }

  return (
    <div className="rounded-xl border border-cyan-800/30 bg-zinc-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-200">Market Maker</h3>
        <div className="flex gap-2">
          {mmSt && <MMStatusBadge />}
          <button onClick={save}
            className="rounded bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-500">
            Save & Apply
          </button>
        </div>
      </div>

      {/* Mode + Strategy */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-zinc-500 mb-1">Mode</label>
          <div className="flex gap-1">
            {[false, true].map((v) => (
              <button key={String(v)} onClick={() => setCfg({ ...cfg, enabled: v })}
                className={`flex-1 rounded px-2 py-1.5 text-xs ${
                  cfg.enabled === v ? (v ? "bg-cyan-700 text-white" : "bg-zinc-700 text-zinc-200")
                                    : "bg-zinc-800 text-zinc-500"
                }`}>
                {v ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 mb-1">Strategy</label>
          <div className="flex gap-1">
            {["book", "fairvalue"].map((s) => (
              <button key={s} onClick={() => setCfg({ ...cfg, strategy: s })}
                className={`flex-1 rounded px-2 py-1.5 text-xs ${
                  cfg.strategy === s ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ladder */}
      <div className="grid grid-cols-4 gap-3">
        <Slider label="Levels" value={cfg.ladder_levels} min={1} max={5} step={1}
          onChange={(v) => setCfg({ ...cfg, ladder_levels: v })} />
        <Slider label="Step (c)" value={cfg.ladder_step_cents} min={0.1} max={3} step={0.1}
          onChange={(v) => setCfg({ ...cfg, ladder_step_cents: v })} />
        <Num label="Size (sh)" value={cfg.level_size} min={5} max={200}
          onChange={(v) => setCfg({ ...cfg, level_size: v })} />
        <Slider label="Offset (c)" value={cfg.offset_cents} min={0.1} max={5} step={0.1}
          onChange={(v) => setCfg({ ...cfg, offset_cents: v })} />
      </div>

      {/* Protections */}
      <div className="grid grid-cols-3 gap-2">
        <Toggle label="Stale Quote" value={cfg.prot_stale}
          onChange={(v) => setCfg({ ...cfg, prot_stale: v })} />
        <Toggle label="Thin Book" value={cfg.prot_thin}
          onChange={(v) => setCfg({ ...cfg, prot_thin: v })} />
        <Toggle label="Price Shift" value={cfg.prot_shift}
          onChange={(v) => setCfg({ ...cfg, prot_shift: v })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Num label="Expiry stop (s)" value={cfg.expiry_stop_sec} min={10} max={60}
          onChange={(v) => setCfg({ ...cfg, expiry_stop_sec: v })} />
        <Num label="Inv warn" value={cfg.inv_warn} min={50} max={1000}
          onChange={(v) => setCfg({ ...cfg, inv_warn: v })} />
        <Num label="Inv crit" value={cfg.inv_crit} min={100} max={2000}
          onChange={(v) => setCfg({ ...cfg, inv_crit: v })} />
      </div>

      {/* Preview */}
      <div className="rounded bg-zinc-950 p-2 text-[10px] text-zinc-500 font-mono">
        {cfg.enabled ? "ON" : "OFF"} {cfg.strategy} | {cfg.ladder_levels}lvl x{cfg.level_size}sh step={cfg.ladder_step_cents}c | expiry={cfg.expiry_stop_sec}s
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">
        {label} <span className="text-yellow-400">{value}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
    </div>
  );
}

function Num({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || value)}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none" />
    </div>
  );
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button onClick={() => onChange(!value)}
      className={`rounded border px-2 py-1 text-[10px] w-full ${
        value ? "border-emerald-700 text-emerald-400 bg-emerald-900/20"
              : "border-zinc-700 text-zinc-500 bg-zinc-800"
      }`}>
      {value ? "ON" : "OFF"} {label}
    </button>
  );
}
