"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function TopNav({
  currentUser,
}: {
  currentUser: { name: string; role: "ADMIN" | "MEMBER" | "REQUESTER" };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      pathname === href
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-900">Team Tracker</span>
        <nav className="flex items-center gap-1">
          <Link href="/board" className={linkClass("/board")}>
            Board
          </Link>
          {currentUser.role === "ADMIN" && (
            <Link href="/admin" className={linkClass("/admin")}>
              Admin
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>{currentUser.name}</span>
        <Link
          href="/change-password"
          className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
        >
          Change password
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
