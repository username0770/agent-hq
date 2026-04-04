"use client";

interface OrderBookProps {
  bids: [number, number][];
  asks: [number, number][];
  spread: number;
}

export default function OrderBook({ bids, asks, spread }: OrderBookProps) {
  const maxSize = Math.max(
    ...asks.map((a) => a[1]),
    ...bids.map((b) => b[1]),
    1
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
        Order Book (UP token)
      </h4>
      <div className="space-y-0.5 text-xs font-mono">
        {[...asks].reverse().map(([price, size], i) => (
          <div key={`a${i}`} className="flex items-center gap-2">
            <span className="w-10 text-right text-red-400">
              {price.toFixed(2)}
            </span>
            <div className="flex-1 flex justify-end">
              <div
                className="h-3 bg-red-500/20 rounded-sm"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
            </div>
            <span className="w-14 text-right text-zinc-500">
              {size.toFixed(1)}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-2 py-1">
          <span className="w-10" />
          <div className="flex-1 border-t border-zinc-700 relative">
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-zinc-900 px-2 text-[10px] text-zinc-500">
              spread {spread.toFixed(2)}
            </span>
          </div>
          <span className="w-14" />
        </div>

        {bids.map(([price, size], i) => (
          <div key={`b${i}`} className="flex items-center gap-2">
            <span className="w-10 text-right text-emerald-400">
              {price.toFixed(2)}
            </span>
            <div className="flex-1">
              <div
                className="h-3 bg-emerald-500/20 rounded-sm"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
            </div>
            <span className="w-14 text-right text-zinc-500">
              {size.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
