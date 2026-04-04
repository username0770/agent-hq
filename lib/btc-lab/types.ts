// === Strategy ===

export interface Strategy {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalBets: number;
  totalRealBets: number;
  totalPaperBets: number;
  winRate: number;
  totalPnl: number;
  totalFees: number;
  avgEdge: number;
}

// === Bet ===

export interface RealBet {
  id: string;
  sessionId: string;
  strategyId: string;
  strategyName: string;
  betType: "real" | "paper";

  marketQuestion: string;
  marketSlug: string;
  upTokenId: string;
  downTokenId: string;
  eventStartTime: string;
  eventEndTime: string;

  side: "UP" | "DOWN";
  amountUSDC: number;
  intendedPrice: number;
  executedPrice: number | null;
  slippage: number | null;
  sharesReceived: number | null;

  feeRate: number;
  feeCalculated: number;
  feeActual: number | null;

  targetPrice: number | null;
  targetPriceSource: "auto" | "manual";
  cexMedianAtBet: number;
  binancePriceAtBet: number | null;
  coinbasePriceAtBet: number | null;
  okxPriceAtBet: number | null;
  bybitPriceAtBet: number | null;
  moveFromTarget: number | null;
  movePercent: number | null;

  pmUpPriceAtBet: number;
  pmDownPriceAtBet: number;
  pmBidAtBet: number | null;
  pmAskAtBet: number | null;
  pmSpreadAtBet: number | null;

  orderBookBids: [number, number][];
  orderBookAsks: [number, number][];

  fairProbability: number;
  edge: number;
  modelVolatility: number;

  secondsLeftAtBet: number;
  timerPhase: "early" | "mid" | "late";
  placedAt: string;

  txHash: string | null;
  orderId: string | null;
  orderStatus: string | null;

  outcome: "WIN" | "LOSS" | "VOID" | "PENDING";
  resolvedPrice: number | null;
  resolvedAt: string | null;
  grossPnl: number | null;
  netPnl: number | null;
  roi: number | null;

  note: string | null;
  autoPlaced: boolean;
  signalType: string | null;
}

// === Helpers ===

export const PM_FEE_RATE = 0.072;

export function calcFee(amount: number, price: number, rate = PM_FEE_RATE) {
  const p = Math.max(0.01, Math.min(0.99, price));
  return amount * rate * p * (1 - p);
}

export function timerPhase(secondsLeft: number): "early" | "mid" | "late" {
  if (secondsLeft > 180) return "early";
  if (secondsLeft > 60) return "mid";
  return "late";
}

export function calcBetPnl(
  bet: RealBet,
  outcome: "UP" | "DOWN"
): { grossPnl: number; netPnl: number; roi: number; won: boolean } {
  const won = bet.side === outcome;
  const price = bet.executedPrice ?? bet.intendedPrice;
  const shares = bet.sharesReceived ?? bet.amountUSDC / price;
  const fee = bet.feeActual ?? bet.feeCalculated;
  const grossPnl = won ? shares * 1.0 - bet.amountUSDC : -bet.amountUSDC;
  const netPnl = grossPnl - fee;
  const roi = bet.amountUSDC > 0 ? (netPnl / bet.amountUSDC) * 100 : 0;
  return {
    grossPnl: Math.round(grossPnl * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100,
    roi: Math.round(roi * 10) / 10,
    won,
  };
}

// KV key helpers
export const KV = {
  strategiesList: "btc-lab:v2:strategies",
  strategy: (id: string) => `btc-lab:v2:strategy:${id}`,
  strategyBets: (id: string) => `btc-lab:v2:strategy:${id}:bets`,
  bet: (id: string) => `btc-lab:v2:bet:${id}`,
  betsReal: "btc-lab:v2:bets:real",
  betsPaper: "btc-lab:v2:bets:paper",
};
