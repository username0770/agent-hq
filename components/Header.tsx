"use client";

import { signOut } from "next-auth/react";

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
      <div className="lg:hidden w-10" /> {/* spacer for mobile menu button */}
      <h2 className="text-sm font-medium text-zinc-400">Command Center</h2>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        Sign Out
      </button>
    </header>
  );
}
