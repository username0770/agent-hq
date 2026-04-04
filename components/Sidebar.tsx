"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/btc-lab", label: "BTC Lab", icon: "🧪" },
  { href: "/dashboard/btc-lab/strategies", label: "Strategies", icon: "🎯" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "📋" },
  { href: "/dashboard/agents", label: "Agents", icon: "🤖" },
  { href: "/dashboard/docs", label: "Docs", icon: "📚" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-zinc-800 p-2 text-zinc-300 lg:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-60 border-r border-zinc-800 bg-zinc-900 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <span className="text-xl">🏴</span>
          <span className="text-lg font-bold text-zinc-100">Agent HQ</span>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Polymarket Arb Bot</p>
            <p className="text-xs text-emerald-400">v0.1.0 alpha</p>
          </div>
        </div>
      </aside>
    </>
  );
}
