import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getSession();
  const [users, boards] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, managerId: true },
      orderBy: { name: "asc" },
    }),
    prisma.board.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AdminClient
      currentUser={{ id: session!.sub, name: session!.name, role: session!.role }}
      initialUsers={users}
      boards={boards}
    />
  );
}
