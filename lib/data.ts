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

export type Agent = {
  id: string;
  name: string;
  realName: string;
  emoji: string;
  role: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  motto: string;
  specialization: string;
  workStyle: string;
  tags: string[];
  status: "online" | "standby" | "always";
  avatar: string;
  group: "team" | "personal";
};

export const agents: Agent[] = [
  {
    id: "analyst",
    name: "Analyst",
    realName: "Алекс",
    emoji: "\ud83d\udd0d",
    avatar: "/avatars/alex.png",
    role: "Data & Analytics",
    color: "text-blue-400",
    colorBg: "bg-blue-500/20",
    colorBorder: "border-blue-500/30",
    motto: "Данные не лгут. Люди интерпретируют их неверно.",
    specialization:
      "Глубокий анализ P&L и ROI. Сопоставляет данные БД с Polymarket API. Считает реальные комиссии и edge. Выявляет паттерны в проигрышных ставках.",
    workStyle:
      'Методичный, требует точности. Перепроверяет каждую цифру дважды. Не принимает "примерно" — только точные данные.',
    tags: ["Статистика", "P&L", "Polymarket API"],
    status: "online",
    group: "team",
  },
  {
    id: "copywriter",
    name: "Copywriter",
    realName: "Мира",
    emoji: "\u270d\ufe0f",
    avatar: "/avatars/mira.png",
    role: "Documentation",
    color: "text-purple-400",
    colorBg: "bg-purple-500/20",
    colorBorder: "border-purple-500/30",
    motto: "Хорошая документация — это код который объясняет сам себя.",
    specialization:
      "Пишет документацию, README, техзадания для Claude Code. Формулирует промпты. Ведёт журнал решений и создаёт инструкции.",
    workStyle:
      "Структурированный и лаконичный. Ненавидит лишние слова. Каждое предложение должно нести смысл.",
    tags: ["Документация", "Промпты", "Коммуникация"],
    status: "online",
    group: "team",
  },
  {
    id: "developer",
    name: "Developer",
    realName: "Макс",
    emoji: "\ud83d\udcbb",
    avatar: "/avatars/max.png",
    role: "Engineering",
    color: "text-emerald-400",
    colorBg: "bg-emerald-500/20",
    colorBorder: "border-emerald-500/30",
    motto: "Работающий код сегодня лучше идеального кода никогда.",
    specialization:
      "Пишет и рефакторит Python-код бота. Работает с pm_sync.py, valuebet_bot.py, polymarket_client.py. Настраивает инфраструктуру и деплой.",
    workStyle:
      "Практичный прагматик. Сначала делает MVP, потом улучшает. Пишет тесты только для критичной логики.",
    tags: ["Python", "Next.js", "DevOps"],
    status: "online",
    group: "team",
  },
  {
    id: "strategist",
    name: "Strategist",
    realName: "Виктор",
    emoji: "\ud83c\udfaf",
    avatar: "/avatars/viktor.png",
    role: "Strategy & Planning",
    color: "text-orange-400",
    colorBg: "bg-orange-500/20",
    colorBorder: "border-orange-500/30",
    motto:
      "Стратегия без тактики — медленный путь к победе. Тактика без стратегии — шум перед поражением.",
    specialization:
      "Определяет min edge, фильтры спортов, размер ставок. Принимает решения о resell, live betting и risk management. Анализирует долгосрочные тренды.",
    workStyle:
      "Мыслит на 3 шага вперёд. Не боится резать убыточные направления. Ориентируется на долгосрочный EV, игнорирует краткосрочные эмоции.",
    tags: ["Риск-менеджмент", "Edge", "Стратегия"],
    status: "online",
    group: "team",
  },
  {
    id: "assistant",
    name: "Assistant",
    realName: "Соня",
    emoji: "\ud83d\udee0\ufe0f",
    avatar: "/avatars/sonya.png",
    role: "Operations",
    color: "text-sky-400",
    colorBg: "bg-sky-500/20",
    colorBorder: "border-sky-500/30",
    motto: "Хаос — это просто порядок которому ещё не дали название.",
    specialization:
      "Координирует задачи между агентами. Следит за приоритетами и дедлайнами. Управляет Kanban-доской и напоминает о важных решениях.",
    workStyle:
      "Энергичная и внимательная к деталям. Первой замечает когда что-то идёт не по плану. Держит всех в тонусе.",
    tags: ["Координация", "Приоритеты", "Организация"],
    status: "standby",
    group: "team",
  },
  {
    id: "lifecoach",
    name: "Life Coach",
    realName: "Ника",
    emoji: "\ud83e\udde0",
    avatar: "/avatars/nika.png",
    role: "Personal Advisor",
    color: "text-rose-400",
    colorBg: "bg-rose-500/20",
    colorBorder: "border-rose-500/30",
    motto: "Внешние результаты — отражение внутреннего состояния.",
    specialization:
      "Работает с личными вопросами, не связанными с проектом напрямую. Помогает разобраться в приоритетах жизни, балансе работы и отдыха. Поддерживает в моменты сомнений и неопределённости.",
    workStyle:
      "Тёплый, без осуждения. Задаёт правильные вопросы вместо готовых ответов. Верит что у тебя уже есть все ответы внутри.",
    tags: ["Личный рост", "Баланс", "Поддержка"],
    status: "always",
    group: "personal",
  },
];

export type TaskPriority = "urgent" | "important" | "later";
export type TaskCategory = "Bot" | "Infra" | "Personal" | "Strategy";

export type Task = {
  id: string;
  title: string;
  priority: TaskPriority;
  category: TaskCategory;
  description?: string;
};

export type Board = {
  todo: Task[];
  inProgress: Task[];
  done: Task[];
};

export const priorityConfig: Record<
  TaskPriority,
  { emoji: string; label: string; color: string }
> = {
  urgent: { emoji: "\ud83d\udd34", label: "Срочно", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  important: { emoji: "\ud83d\udfe1", label: "Важно", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  later: { emoji: "\ud83d\udfe2", label: "Позже", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

export const categoryConfig: Record<
  TaskCategory,
  { color: string }
> = {
  Bot: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  Infra: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  Personal: { color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  Strategy: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

export const initialTasks: Board = {
  todo: [
    { id: "t1", title: "Отключить resell логику", priority: "urgent", category: "Bot" },
    { id: "t2", title: "Поднять min edge до 4%+", priority: "urgent", category: "Bot" },
    { id: "t3", title: "Исключить CoD, MMA/UFC", priority: "important", category: "Bot" },
    { id: "t4", title: "Telegram алерты", priority: "important", category: "Infra" },
    { id: "t5", title: "VPS деплой 24/7", priority: "important", category: "Infra" },
    { id: "t10", title: "Решение по BetBurger $400", priority: "urgent", category: "Strategy" },
  ],
  inProgress: [
    { id: "t6", title: "pm_sync.py --live запуск", priority: "urgent", category: "Bot" },
    { id: "t7", title: "Пересчёт статистики", priority: "important", category: "Bot" },
  ],
  done: [
    { id: "t8", title: "pm_sync.py написан", priority: "later", category: "Bot" },
    { id: "t9", title: "Реальный P&L пересчитан", priority: "later", category: "Bot" },
    { id: "t11", title: "Agent HQ сайт задеплоен", priority: "later", category: "Infra" },
  ],
};

export const infrastructure = [
  { name: "pm_sync.py", status: "running", detail: "--live mode" },
  { name: "VPS", status: "pending", detail: "Planned deploy" },
  { name: "Telegram Bot", status: "planned", detail: "Alert system" },
  { name: "Polymarket API", status: "connected", detail: "CLOB + Gamma" },
  { name: "BetBurger API", status: "connected", detail: "Valuebets feed" },
  { name: "SQLite DB", status: "running", detail: "valuebet.db" },
];

export const docs = {
  endpoints: [
    { method: "GET", path: "/markets/{condition_id}", description: "Get market info by condition ID" },
    { method: "GET", path: "/book/{token_id}", description: "Get order book for a token" },
    { method: "POST", path: "/order", description: "Place a limit order (CLOB)" },
    { method: "GET", path: "/prices", description: "Get token prices (Gamma API)" },
  ],
  formulas: [
    { name: "Commission", formula: "fee = amount \u00d7 0.02 (2%)", note: "Applied to winning payouts only" },
    { name: "Edge", formula: "edge = (1 / fair_odds) - market_price", note: "Minimum profitable edge: ~3.5% after fees" },
    { name: "ROI", formula: "ROI = (profit / total_invested) \u00d7 100", note: "Track per-category for best signal" },
    { name: "Kelly Criterion", formula: "f = (bp - q) / b", note: "b=odds-1, p=win_prob, q=1-p. Use fractional Kelly (25%)" },
  ],
};
