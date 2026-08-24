"use client";

import { useEffect, useState } from "react";
import { PRIORITIES } from "@/lib/statuses";
import type { BoardDTO } from "@/lib/types";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export default function SubmitTicketPage() {
  const [boards, setBoards] = useState<BoardDTO[]>([]);
  const [form, setForm] = useState({
    boardId: "",
    requesterName: "",
    requesterEmail: "",
    requesterCompany: "",
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => {
        setBoards(data.boards ?? []);
        if (data.boards?.[0]) {
          setForm((f) => ({ ...f, boardId: data.boards[0].id }));
        }
      });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/tickets/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Request submitted</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thanks — your ticket has been filed and assigned to a team member. You&apos;ll be
            contacted at the email you provided.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">File a request</h1>
        <p className="mt-1 text-sm text-slate-500">
          For anyone outside the team who needs to submit a ticket to us.
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Which team?
          <select
            required
            value={form.boardId}
            onChange={(e) => update("boardId", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {boards.length === 0 && <option value="">Loading…</option>}
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Your name
            <input
              required
              value={form.requesterName}
              onChange={(e) => update("requesterName", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Your email
            <input
              type="email"
              required
              value={form.requesterEmail}
              onChange={(e) => update("requesterEmail", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Company / department
          <input
            value={form.requesterCompany}
            onChange={(e) => update("requesterCompany", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Subject
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Details
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Priority
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "submitting" || !form.boardId}
          className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
