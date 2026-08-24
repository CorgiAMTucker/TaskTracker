"use client";

import { useEffect, useState } from "react";
import { PRIORITIES } from "@/lib/statuses";
import type { ColumnDTO, TaskDTO, UserDTO } from "@/lib/types";

export default function TaskDialog({
  open,
  task,
  boardId,
  defaultColumnId,
  onClose,
  users,
  columns,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  task?: TaskDTO;
  boardId: string;
  defaultColumnId?: string;
  onClose: () => void;
  users: UserDTO[];
  columns: ColumnDTO[];
  onSaved: (task: TaskDTO) => void;
  onDeleted?: (taskId: string) => void;
}) {
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setColumnId(task.columnId);
      setPriority(task.priority);
      setAssigneeId(task.assignee?.id ?? "");
    } else {
      setTitle("");
      setDescription("");
      setColumnId(defaultColumnId ?? columns[0]?.id ?? "");
      setPriority("MEDIUM");
      setAssigneeId("");
    }
  }, [open, task, defaultColumnId, columns]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = task
        ? await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description: description || null,
              columnId,
              priority,
              assigneeId: assigneeId || null,
            }),
          })
        : await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              boardId,
              title,
              description: description || undefined,
              columnId,
              priority,
              assigneeId: assigneeId || undefined,
            }),
          });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.task);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setSubmitting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      onDeleted?.(task.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit ? "Edit task" : "New task"}
        </h2>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Title
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Column
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Assignee
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        {isEdit && task?.source === "EXTERNAL_FORM" && (
          <p className="mt-3 rounded-md bg-purple-50 px-3 py-2 text-xs text-purple-700">
            Filed by {task.requesterName} ({task.requesterEmail})
            {task.requesterCompany ? ` — ${task.requesterCompany}` : ""}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              Delete task
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
