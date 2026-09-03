"use client";

import { useEffect, useState } from "react";
import { PRIORITIES } from "@/lib/statuses";
import type { ColumnDTO, NoteDTO, TaskDTO, UserDTO } from "@/lib/types";

const TASK_KIND_LABELS: Record<string, string> = {
  ENDORSEMENT: "Endorsement",
  CUSTOMER_QUESTION: "Customer Question",
  OTHER: "Other",
};

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
  readOnly,
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
  readOnly?: boolean;
}) {
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);

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
    setNewNote("");
  }, [open, task, defaultColumnId, columns]);

  useEffect(() => {
    if (!open || !task) {
      setNotes([]);
      return;
    }
    setNotesLoading(true);
    fetch(`/api/tasks/${task.id}/notes`)
      .then((res) => res.json())
      .then((data) => setNotes(data.notes ?? []))
      .finally(() => setNotesLoading(false));
  }, [open, task]);

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

  async function handleAddNote() {
    if (!task || !newNote.trim()) return;
    setPostingNote(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [...prev, data.note]);
        setNewNote("");
      }
    } finally {
      setPostingNote(false);
    }
  }

  const requesterFullName =
    task?.requesterFirstName || task?.requesterLastName
      ? [task.requesterFirstName, task.requesterLastName].filter(Boolean).join(" ")
      : task?.requesterName;

  const hasRequestDetails =
    isEdit &&
    (requesterFullName ||
      task?.requesterEmail ||
      task?.requesterPhone ||
      task?.requesterCompany ||
      task?.entityFein ||
      task?.atlasLink ||
      task?.coverageRequested ||
      task?.limitsRequested ||
      task?.questionnaireFileUrl ||
      task?.taskKind);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-slate-900">
            {readOnly ? "View task" : isEdit ? "Edit task" : "New task"}
          </h2>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Title
            <input
              required
              autoFocus={!readOnly}
              disabled={readOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700">
            Description
            <textarea
              rows={3}
              disabled={readOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700">
              Column
              <select
                disabled={readOnly}
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
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
                disabled={readOnly}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
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
              disabled={readOnly}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          {hasRequestDetails && (
            <div className="mt-3 space-y-1 rounded-md bg-purple-50 px-3 py-2 text-xs text-purple-700">
              {requesterFullName && (
                <p>
                  Filed by {requesterFullName}
                  {task?.requesterEmail ? ` (${task.requesterEmail})` : ""}
                </p>
              )}
              {task?.requesterPhone && <p>Phone: {task.requesterPhone}</p>}
              {task?.requesterCompany && <p>Company: {task.requesterCompany}</p>}
              {task?.entityFein && <p>Entity FEIN: {task.entityFein}</p>}
              {task?.taskKind && <p>Task Type: {TASK_KIND_LABELS[task.taskKind]}</p>}
              {task?.coverageRequested && <p>Coverage Requested: {task.coverageRequested}</p>}
              {task?.limitsRequested && <p>Limits Requested: {task.limitsRequested}</p>}
              {task?.atlasLink && (
                <p>
                  Atlas Link:{" "}
                  <a href={task.atlasLink} target="_blank" rel="noreferrer" className="underline">
                    {task.atlasLink}
                  </a>
                </p>
              )}
              {task?.questionnaireFileUrl && (
                <p>
                  Questionnaire:{" "}
                  <a
                    href={task.questionnaireFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {task.questionnaireFileName ?? "View file"}
                  </a>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            {isEdit && !readOnly ? (
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
              {readOnly ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Close
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </form>

        {isEdit && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
            {notesLoading ? (
              <p className="mt-2 text-xs text-slate-400">Loading…</p>
            ) : notes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">No notes yet.</p>
            ) : (
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-700">
                      {note.author.name}
                      <span className="ml-2 font-normal text-slate-400">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note…"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={postingNote || !newNote.trim()}
                className="self-end rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
