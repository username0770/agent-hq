import { agents } from "@/lib/data";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agent Team</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{agent.emoji}</span>
              <div>
                <h3 className="font-semibold text-zinc-100">{agent.name}</h3>
                <p className="text-xs text-zinc-500">{agent.role}</p>
              </div>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  agent.status === "active"
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {agent.status}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {agent.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
