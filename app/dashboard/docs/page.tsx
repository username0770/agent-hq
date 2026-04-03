import { docs } from "@/lib/data";

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Documentation</h1>

      {/* API Endpoints */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Polymarket API Endpoints
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {docs.endpoints.map((ep, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        ep.method === "GET"
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-yellow-900/40 text-yellow-400"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {ep.path}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {ep.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Formulas */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Key Formulas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {docs.formulas.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <h3 className="text-sm font-semibold text-zinc-200">{f.name}</h3>
              <p className="mt-2 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-sm text-emerald-400">
                {f.formula}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{f.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick reference */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Quick Reference
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400">CLOB API Base</h3>
            <p className="font-mono text-sm text-zinc-300">
              https://clob.polymarket.com
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-400">Gamma API Base</h3>
            <p className="font-mono text-sm text-zinc-300">
              https://gamma-api.polymarket.com
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-400">Commission</h3>
            <p className="text-sm text-zinc-300">
              2% on winning payouts. No fee on losses.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-400">
              Min Profitable Edge
            </h3>
            <p className="text-sm text-zinc-300">
              ~3.5% after commission (target 4%+)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
