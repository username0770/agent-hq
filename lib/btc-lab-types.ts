export interface Tick {
  ts: number;
  binance: number | null;
  coinbase: number | null;
  okx: number | null;
  bybit: number | null;
  cexMedian: number | null;
  chainlink: number | null;
  pmUpPrice: number | null;
  pmBid: number | null;
  pmAsk: number | null;
  secondsLeft: number;
}

export interface OrderBookSnapshot {
  ts: number;
  bids: [number, number][];
  asks: [number, number][];
  spread: number;
}

export interface PaperBet {
  id: string;
  side: "UP" | "DOWN";
  amount: number;
  price: number;
  cexMedianAtBet: number;
  targetPrice: number;
  moveAtBet: number;
  fairProbability: number;
  edge: number;
  fee: number;
  secondsLeftAtBet: number;
  placedAt: string;
  outcome: "WIN" | "LOSS" | "PENDING";
  pnl: number | null;
  settledAt: string | null;
}

export interface SessionMeta {
  id: string;
  question: string;
  eventStartTime: string;
  endDate: string;
  targetPrice: number | null;
  resolvedOutcome: "UP" | "DOWN" | null;
  createdAt: string;
  completedAt: string | null;
  betCount: number;
  totalPnl: number;
}

export interface Session extends SessionMeta {
  ticks: Tick[];
  orderBook: OrderBookSnapshot[];
  bets: PaperBet[];
}

export interface AggregateStats {
  totalSessions: number;
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalPnl: number;
  avgEdge: number;
}

export const PM_FEE_RATE = 0.072;

export function calcPmFee(amount: number, price: number): number {
  const p = Math.max(0.01, Math.min(0.99, price));
  return amount * PM_FEE_RATE * p * (1 - p);
}

export function calcPnl(
  bet: PaperBet,
  outcome: "UP" | "DOWN"
): { pnl: number; won: boolean } {
  const won = bet.side === outcome;
  const shares = bet.amount / bet.price;
  const fee = calcPmFee(bet.amount, bet.price);
  const pnl = won ? shares * 1.0 - bet.amount - fee : -bet.amount;
  return { pnl: Math.round(pnl * 100) / 100, won };
}
