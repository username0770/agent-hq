import { agents, type Agent } from "@/lib/data";

function StatusDot({ status }: { status: Agent["status"] }) {
  const colors = {
    online: "bg-emerald-400",
    standby: "bg-zinc-500",
    always: "bg-rose-400",
  };
  const labels = {
    online: "online",
    standby: "standby",
    always: "always available",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-[10px] font-medium text-zinc-500 uppercase">
        {labels[status]}
      </span>
    </span>
  );
}

function AgentCard({ agent, warm }: { agent: Agent; warm?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all hover:scale-[1.01] ${
        warm
          ? `${agent.colorBorder} bg-gradient-to-br from-rose-950/40 to-zinc-900`
          : `${agent.colorBorder} bg-zinc-900`
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agent.avatar}
            alt={agent.realName}
            width={64}
            height={64}
            className={`h-16 w-16 rounded-full object-cover ring-2 ${agent.colorBorder}`}
          />
          <div>
            <h3 className="text-lg font-bold text-zinc-100">
              {agent.realName}
            </h3>
            <p className={`text-sm font-medium ${agent.color}`}>{agent.role}</p>
          </div>
        </div>
        <StatusDot status={agent.status} />
      </div>

      {/* Motto */}
      <p className="mb-5 text-sm italic text-zinc-500 leading-relaxed">
        &ldquo;{agent.motto}&rdquo;
      </p>

      {/* Specialization */}
      <div className="mb-4">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Специализация
        </h4>
        <p className="text-sm leading-relaxed text-zinc-300">
          {agent.specialization}
        </p>
      </div>

      {/* Work style */}
      <div className="mb-4">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Стиль работы
        </h4>
        <p className="text-sm leading-relaxed text-zinc-400">
          {agent.workStyle}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {agent.tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${agent.colorBg} ${agent.color} ${agent.colorBorder}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const teamAgents = agents.filter((a) => a.group === "team");
  const personalAgents = agents.filter((a) => a.group === "personal");

  return (
    <div className="space-y-10">
      {/* Team section */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Agent Team</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Команда проекта — {teamAgents.length} агентов
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teamAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest">
          Личный советник
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Personal section */}
      <div className="max-w-2xl mx-auto">
        {personalAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} warm />
        ))}
      </div>
    </div>
  );
}
