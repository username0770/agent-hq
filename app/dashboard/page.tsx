import { metrics, aprilMetrics, agents, infrastructure } from "@/lib/data";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.values(metrics).map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-xs font-medium text-zinc-500">{m.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                m.negative ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {m.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{m.change}</p>
          </div>
        ))}
      </div>

      {/* April highlight */}
      <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-lg">
            {aprilMetrics.roi}
          </span>
          <span className="text-sm text-zinc-400">
            April 2026 ROI — {aprilMetrics.trades} trades, avg edge{" "}
            {aprilMetrics.avgEdge}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{aprilMetrics.note}</p>
      </div>

      {/* Agents & Infra */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agents */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Team
          </h2>
          <div className="space-y-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
              >
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">
                    {a.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{a.role}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    a.status === "active"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Infrastructure
          </h2>
          <div className="space-y-2">
            {infrastructure.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.status === "running" || item.status === "connected"
                      ? "bg-emerald-400"
                      : item.status === "pending"
                      ? "bg-yellow-400"
                      : "bg-zinc-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-500">{item.detail}</p>
                </div>
                <span className="text-[10px] font-medium text-zinc-500 uppercase">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
