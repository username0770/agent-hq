"use client";

import { useState, useEffect, useRef } from "react";
import {
  initialTasks,
  priorityConfig,
  categoryConfig,
  type Task,
  type Board,
  type TaskPriority,
  type TaskCategory,
} from "@/lib/data";

const STORAGE_KEY = "agent-hq-tasks-v2";

const columns: { key: keyof Board; label: string; color: string }[] = [
  { key: "todo", label: "Todo", color: "border-zinc-600" },
  { key: "inProgress", label: "In Progress", color: "border-yellow-600" },
  { key: "done", label: "Done", color: "border-emerald-600" },
];

const moveOptions: Record<keyof Board, { key: keyof Board; label: string }[]> =
  {
    todo: [{ key: "inProgress", label: "\u2192 In Progress" }],
    inProgress: [
      { key: "todo", label: "\u2190 Todo" },
      { key: "done", label: "\u2192 Done" },
    ],
    done: [{ key: "inProgress", label: "\u2190 In Progress" }],
  };

const priorities: TaskPriority[] = ["urgent", "important", "later"];
const categories: TaskCategory[] = ["Bot", "Infra", "Personal", "Strategy"];

// --- Add Task Modal ---
function AddTaskModal({
  column,
  onAdd,
  onClose,
}: {
  column: keyof Board;
  onAdd: (task: Omit<Task, "id">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("important");
  const [category, setCategory] = useState<TaskCategory>("Bot");
  const [description, setDescription] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function submit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      priority,
      category,
      description: description.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
      >
        <h3 className="mb-4 text-lg font-bold text-zinc-100">
          New Task &rarr; {columns.find((c) => c.key === column)?.label}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              placeholder="Task title..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityConfig[p].emoji} {priorityConfig[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Details..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Task Detail Modal ---
function TaskDetailModal({
  task,
  column,
  onClose,
  onMove,
  onDelete,
  onUpdate,
}: {
  task: Task;
  column: keyof Board;
  onClose: () => void;
  onMove: (from: keyof Board, to: keyof Board, id: string) => void;
  onDelete: (col: keyof Board, id: string) => void;
  onUpdate: (col: keyof Board, task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [category, setCategory] = useState(task.category);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function save() {
    onUpdate(column, {
      ...task,
      title: title.trim() || task.title,
      description: desc.trim() || undefined,
      priority,
      category,
    });
    setEditing(false);
  }

  const prio = priorityConfig[task.priority];
  const cat = categoryConfig[task.category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={ref}
        className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
      >
        {editing ? (
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityConfig[p].emoji} {priorityConfig[p].label}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Description..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-bold text-zinc-100">{task.title}</h3>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Edit
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${prio.color}`}
              >
                {prio.emoji} {prio.label}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cat.color}`}
              >
                {task.category}
              </span>
            </div>

            {task.description && (
              <p className="mb-4 text-sm text-zinc-400 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 border-t border-zinc-800 pt-4">
              {moveOptions[column].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    onMove(column, opt.key, task.id);
                    onClose();
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onDelete(column, task.id);
                  onClose();
                }}
                className="ml-auto rounded-lg border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Task Card ---
function TaskCard({
  task,
  column,
  onOpen,
  onDragStart,
}: {
  task: Task;
  column: keyof Board;
  onOpen: (task: Task, col: keyof Board) => void;
  onDragStart: (e: React.DragEvent, task: Task, col: keyof Board) => void;
}) {
  const prio = priorityConfig[task.priority];
  const cat = categoryConfig[task.category];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task, column)}
      onClick={() => onOpen(task, column)}
      className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900 active:scale-[0.98]"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${prio.color}`}
        >
          {prio.emoji} {prio.label}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cat.color}`}
        >
          {task.category}
        </span>
      </div>
      <p className="text-sm text-zinc-300">{task.title}</p>
      {task.description && (
        <p className="mt-1 text-xs text-zinc-600 truncate">
          {task.description}
        </p>
      )}
    </div>
  );
}

// --- Main Page ---
export default function TasksPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [addingTo, setAddingTo] = useState<keyof Board | null>(null);
  const [viewingTask, setViewingTask] = useState<{
    task: Task;
    col: keyof Board;
  } | null>(null);
  const [dragOver, setDragOver] = useState<keyof Board | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.todo?.[0]?.priority) {
          setBoard(parsed);
          return;
        }
      } catch { /* use defaults */ }
    }
    setBoard(initialTasks);
  }, []);

  useEffect(() => {
    if (board) localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }, [board]);

  if (!board) return null;

  function addTask(col: keyof Board, data: Omit<Task, "id">) {
    if (!board) return;
    const task: Task = { id: `t${Date.now()}`, ...data };
    setBoard({ ...board, [col]: [...board[col], task] });
  }

  function removeTask(col: keyof Board, id: string) {
    if (!board) return;
    setBoard({ ...board, [col]: board[col].filter((t) => t.id !== id) });
  }

  function moveTask(from: keyof Board, to: keyof Board, id: string) {
    if (!board || from === to) return;
    const task = board[from].find((t) => t.id === id);
    if (!task) return;
    setBoard({
      ...board,
      [from]: board[from].filter((t) => t.id !== id),
      [to]: [...board[to], task],
    });
  }

  function updateTask(col: keyof Board, updated: Task) {
    if (!board) return;
    setBoard({
      ...board,
      [col]: board[col].map((t) => (t.id === updated.id ? updated : t)),
    });
  }

  // Drag handlers
  function handleDragStart(
    e: React.DragEvent,
    task: Task,
    col: keyof Board
  ) {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("fromCol", col);
  }

  function handleDragOver(e: React.DragEvent, col: keyof Board) {
    e.preventDefault();
    setDragOver(col);
  }

  function handleDrop(e: React.DragEvent, toCol: keyof Board) {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData("taskId");
    const fromCol = e.dataTransfer.getData("fromCol") as keyof Board;
    if (taskId && fromCol) moveTask(fromCol, toCol, taskId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map(({ key, label, color }) => (
          <div
            key={key}
            onDragOver={(e) => handleDragOver(e, key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, key)}
            className={`rounded-xl border-t-2 ${color} border border-zinc-800 bg-zinc-900 p-4 transition-colors ${
              dragOver === key ? "bg-zinc-800/50 border-zinc-600" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">
                {label}{" "}
                <span className="text-zinc-600">({board[key].length})</span>
              </h3>
              <button
                onClick={() => setAddingTo(key)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {board[key].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  column={key}
                  onOpen={(t, c) => setViewingTask({ task: t, col: c })}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>

            {board[key].length === 0 && (
              <p className="py-8 text-center text-xs text-zinc-700">
                Drop tasks here
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {addingTo && (
        <AddTaskModal
          column={addingTo}
          onAdd={(data) => addTask(addingTo, data)}
          onClose={() => setAddingTo(null)}
        />
      )}

      {/* Task Detail Modal */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask.task}
          column={viewingTask.col}
          onClose={() => setViewingTask(null)}
          onMove={moveTask}
          onDelete={removeTask}
          onUpdate={updateTask}
        />
      )}
    </div>
  );
}
