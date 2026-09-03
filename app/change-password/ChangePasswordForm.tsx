"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't change your password. Please try again.");
        return;
      }
      if (forced) {
        router.replace("/");
        router.refresh();
      } else {
        setDone(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-slate-900">
        {forced ? "Set a new password" : "Change password"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {forced
          ? "You're signing in with a temporary password. Set your own before continuing."
          : "Update the password on your account."}
      </p>

      <label className="mt-6 block text-sm font-medium text-slate-700">
        Current password
        <input
          type="password"
          required
          autoFocus
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        New password
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Confirm new password
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-4 text-sm text-green-600">Password updated.</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
