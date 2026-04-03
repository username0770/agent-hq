"use client";

import { useState, useEffect } from "react";
import { initialTasks } from "@/lib/data";

type Task = { id: string; title: string };
type Board = { todo: Task[]; inProgress: Task[]; done: Task[] };

const STORAGE_KEY = "agent-hq-tasks";

const columns: { key: keyof Board; label: string; color: string }[] = [
  { key: "todo", label: "Todo", color: "border-zinc-600" },
  { key: "inProgress", label: "In Progress", color: "border-yellow-600" },
  { key: "done", label: "Done", color: "border-emerald-600" },
];

export default function TasksPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [newTask, setNewTask] = useState("");
  const [addingTo, setAddingTo] = useState<keyof Board | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBoard(JSON.parse(saved));
    } else {
      setBoard(initialTasks);
    }
  }, []);

  useEffect(() => {
    if (board) localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }, [board]);

  if (!board) return null;

  function addTask(col: keyof Board) {
    if (!newTask.trim() || !board) return;
    const task: Task = { id: `t${Date.now()}`, title: newTask.trim() };
    setBoard({ ...board, [col]: [...board[col], task] });
    setNewTask("");
    setAddingTo(null);
  }

  function removeTask(col: keyof Board, id: string) {
    if (!board) return;
    setBoard({ ...board, [col]: board[col].filter((t) => t.id !== id) });
  }

  function moveTask(from: keyof Board, to: keyof Board, id: string) {
    if (!board) return;
    const task = board[from].find((t) => t.id === id);
    if (!task) return;
    setBoard({
      ...board,
      [from]: board[from].filter((t) => t.id !== id),
      [to]: [...board[to], task],
    });
  }

  const moveOptions: Record<keyof Board, { key: keyof Board; label: string }[]> = {
    todo: [{ key: "inProgress", label: "→ In Progress" }],
    inProgress: [
      { key: "todo", label: "← Todo" },
      { key: "done", label: "→ Done" },
    ],
    done: [{ key: "inProgress", label: "← In Progress" }],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl border-t-2 ${color} border border-zinc-800 bg-zinc-900 p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">
                {label}{" "}
                <span className="text-zinc-600">({board[key].length})</span>
              </h3>
              <button
                onClick={() => setAddingTo(addingTo === key ? null : key)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                + Add
              </button>
            </div>

            {addingTo === key && (
              <div className="mb-3 flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask(key)}
                  placeholder="Task title..."
                  autoFocus
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => addTask(key)}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Add
                </button>
              </div>
            )}

            <div className="space-y-2">
              {board[key].map((task) => (
                <div
                  key={task.id}
                  className="group rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <p className="text-sm text-zinc-300">{task.title}</p>
                  <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {moveOptions[key].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => moveTask(key, opt.key, task.id)}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => removeTask(key, task.id)}
                      className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
