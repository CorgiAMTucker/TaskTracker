import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BoardClient from "./BoardClient";

export default async function BoardPage() {
  const session = await getSession();
  const [users, boards] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, managerId: true },
      orderBy: { name: "asc" },
    }),
    prisma.board.findMany({
      orderBy: { order: "asc" },
      include: {
        columns: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true } },
      },
    }),
  ]);

  return (
    <BoardClient
      currentUser={{ id: session!.sub, name: session!.name, role: session!.role }}
      users={users}
      initialBoards={boards}
    />
  );
}
