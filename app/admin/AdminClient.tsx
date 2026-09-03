"use client";

import { useEffect, useState } from "react";
import TopNav from "@/app/components/TopNav";
import type { UserDTO } from "@/lib/types";

type RoundRobinMemberDTO = {
  id: string;
  active: boolean;
  order: number;
  user: { id: string; name: string; email: string };
};

type BoardSummary = { id: string; name: string };

export default function AdminClient({
  currentUser,
  initialUsers,
  boards,
}: {
  currentUser: { id: string; name: string; role: "ADMIN" | "MEMBER" | "REQUESTER" };
  initialUsers: UserDTO[];
  boards: BoardSummary[];
}) {
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id ?? "");
  const [members, setMembers] = useState<RoundRobinMemberDTO[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const availableToAdd = users.filter((u) => !members.some((m) => m.user.id === u.id));

  async function refreshUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  async function refreshMembers() {
    if (!activeBoardId) return;
    const res = await fetch(`/api/round-robin?boardId=${activeBoardId}`);
    const data = await res.json();
    setMembers(data.members ?? []);
  }

  useEffect(() => {
    refreshMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoardId]);

  async function handleCreateUser(form: {
    name: string;
    email: string;
    password: string;
    role: string;
    managerId: string;
  }) {
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        managerId: form.managerId || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create user");
      return false;
    }
    await refreshUsers();
    return true;
  }

  async function handleUpdateUser(id: string, data: Record<string, unknown>) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refreshUsers();
  }

  async function handleAddMember() {
    if (!addUserId || !activeBoardId) return;
    const res = await fetch("/api/round-robin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: activeBoardId, userId: addUserId }),
    });
    if (res.ok) {
      setAddUserId("");
      await refreshMembers();
    }
  }

  async function handleToggleActive(memberId: string, active: boolean) {
    await fetch(`/api/round-robin/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await refreshMembers();
  }

  async function handleRemoveMember(memberId: string) {
    await fetch(`/api/round-robin/${memberId}`, { method: "DELETE" });
    await refreshMembers();
  }

  async function handleReorder(memberId: string, direction: -1 | 1) {
    const index = members.findIndex((m) => m.id === memberId);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= members.length) return;
    const next = [...members];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setMembers(next);
    await fetch("/api/round-robin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: next.map((m) => m.id) }),
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-6 py-8">
        <section>
          <h1 className="text-lg font-semibold text-slate-900">Team members</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set each person&apos;s manager so &quot;My team&quot; filtering works on the board.
          </p>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Reports to</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-2 text-slate-500">{u.email}</td>
                    <td className="px-4 py-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        <option value="REQUESTER">Basic User (requests & notes only)</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={u.managerId ?? ""}
                        onChange={(e) =>
                          handleUpdateUser(u.id, { managerId: e.target.value || null })
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— none —</option>
                        {users
                          .filter((m) => m.id !== u.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          const password = window.prompt(`New password for ${u.name} (min 8 characters):`);
                          if (password && password.length >= 8) {
                            handleUpdateUser(u.id, { password });
                          } else if (password) {
                            window.alert("Password must be at least 8 characters.");
                          }
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Reset password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <NewUserForm onSubmit={handleCreateUser} users={users} error={error} />
        </section>

        <section>
          <h1 className="text-lg font-semibold text-slate-900">Round-robin assignment</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each board has its own rotation. New tickets filed through the external request
            form are assigned to the next active person in that board&apos;s rotation, in order.
          </p>

          <div className="mt-4 flex items-center gap-1 border-b border-slate-200">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBoardId(b.id)}
                className={`rounded-t-md px-3 py-1.5 text-sm font-medium ${
                  b.id === activeBoardId
                    ? "border border-b-0 border-slate-200 bg-white text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Add a team member to the rotation…</option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!addUserId}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <ol className="mt-4 space-y-2">
            {members.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs text-slate-400">{i + 1}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {usersById[m.user.id]?.name ?? m.user.name}
                  </span>
                  {!m.active && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      Paused
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleReorder(m.id, -1)}
                    disabled={i === 0}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorder(m.id, 1)}
                    disabled={i === members.length - 1}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleToggleActive(m.id, !m.active)}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    {m.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-slate-400">No one is in the rotation yet.</p>
            )}
          </ol>
        </section>
      </main>
    </div>
  );
}

function NewUserForm({
  onSubmit,
  users,
  error,
}: {
  onSubmit: (form: {
    name: string;
    email: string;
    password: string;
    role: string;
    managerId: string;
  }) => Promise<boolean>;
  users: UserDTO[];
  error: string | null;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
    managerId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit(form);
    setSubmitting(false);
    if (ok) {
      setForm({ name: "", email: "", password: "", role: "MEMBER", managerId: "" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5 sm:items-end"
    >
      <label className="text-sm font-medium text-slate-700 sm:col-span-1">
        Name
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-1">
        Email
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-1">
        Temp password
        <input
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-1">
        Reports to
        <select
          value={form.managerId}
          onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">— none —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-1"
      >
        {submitting ? "Adding…" : "Add member"}
      </button>
      {error && <p className="text-sm text-red-600 sm:col-span-5">{error}</p>}
    </form>
  );
}
