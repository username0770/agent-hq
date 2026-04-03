export const metrics = {
  pnl: { label: "P&L", value: "-$9,943", change: "-9.08%", negative: true },
  roi: { label: "ROI", value: "-9.08%", change: "Apr: +1.4%", negative: true },
  won: { label: "Won", value: "1,868", change: "+52.8%", negative: false },
  lost: { label: "Lost", value: "1,668", change: "47.2%", negative: true },
};

export const aprilMetrics = {
  roi: "+1.4%",
  trades: 342,
  avgEdge: "3.2%",
  note: "April 2026 — first profitable month with pm_sync.py",
};

export const agents = [
  {
    id: "analyst",
    name: "Analyst",
    emoji: "📈",
    role: "Data & Analytics",
    description:
      "Анализирует P&L, ROI, рассчитывает edge. Проверяет данные BetBurger и Polymarket. Строит статистику по категориям и таймфреймам.",
    status: "active" as const,
  },
  {
    id: "copywriter",
    name: "Copywriter",
    emoji: "✍️",
    role: "Documentation",
    description:
      "Пишет документацию, README, инструкции. Формулирует промпты и описания задач. Ведёт журнал решений.",
    status: "active" as const,
  },
  {
    id: "developer",
    name: "Developer",
    emoji: "💻",
    role: "Engineering",
    description:
      "Пишет и рефакторит код: pm_sync.py, live_bot.py, valuebet_bot.py. Настраивает инфраструктуру, VPS, деплой.",
    status: "active" as const,
  },
  {
    id: "strategist",
    name: "Strategist",
    emoji: "🎯",
    role: "Strategy & Planning",
    description:
      "Определяет стратегию: min edge, фильтры, категории. Принимает решения о resell, live betting, risk management.",
    status: "active" as const,
  },
  {
    id: "assistant",
    name: "Assistant",
    emoji: "🛠️",
    role: "Operations",
    description:
      "Координирует задачи между агентами. Следит за приоритетами и дедлайнами. Управляет Kanban-доской.",
    status: "standby" as const,
  },
];

export const infrastructure = [
  { name: "pm_sync.py", status: "running", detail: "--live mode" },
  { name: "VPS", status: "pending", detail: "Planned deploy" },
  { name: "Telegram Bot", status: "planned", detail: "Alert system" },
  { name: "Polymarket API", status: "connected", detail: "CLOB + Gamma" },
  { name: "BetBurger API", status: "connected", detail: "Valuebets feed" },
  { name: "SQLite DB", status: "running", detail: "valuebet.db" },
];

export const initialTasks = {
  todo: [
    { id: "t1", title: "Отключить resell логику" },
    { id: "t2", title: "Поднять min edge до 4%+" },
    { id: "t3", title: "Исключить CoD MMA из фильтров" },
    { id: "t4", title: "Telegram алерты" },
    { id: "t5", title: "VPS деплой" },
  ],
  inProgress: [
    { id: "t6", title: "pm_sync.py --live запуск" },
    { id: "t7", title: "Пересчёт статистики" },
  ],
  done: [
    { id: "t8", title: "pm_sync.py написан" },
    { id: "t9", title: "Реальный P&L пересчитан" },
  ],
};

export const docs = {
  endpoints: [
    {
      method: "GET",
      path: "/markets/{condition_id}",
      description: "Get market info by condition ID",
    },
    {
      method: "GET",
      path: "/book/{token_id}",
      description: "Get order book for a token",
    },
    {
      method: "POST",
      path: "/order",
      description: "Place a limit order (CLOB)",
    },
    {
      method: "GET",
      path: "/prices",
      description: "Get token prices (Gamma API)",
    },
  ],
  formulas: [
    {
      name: "Commission",
      formula: "fee = amount × 0.02 (2%)",
      note: "Applied to winning payouts only",
    },
    {
      name: "Edge",
      formula: "edge = (1 / fair_odds) - market_price",
      note: "Minimum profitable edge: ~3.5% after fees",
    },
    {
      name: "ROI",
      formula: "ROI = (profit / total_invested) × 100",
      note: "Track per-category for best signal",
    },
    {
      name: "Kelly Criterion",
      formula: "f = (bp - q) / b",
      note: "b=odds-1, p=win_prob, q=1-p. Use fractional Kelly (25%)",
    },
  ],
};
