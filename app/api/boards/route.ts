import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await prisma.board.findMany({
    orderBy: { order: "asc" },
    include: {
      columns: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true } },
      roundRobinMembers: {
        where: { active: true },
        orderBy: { order: "asc" },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    boards: boards.map((b) => ({
      id: b.id,
      name: b.name,
      order: b.order,
      columns: b.columns,
      availableAMs: b.roundRobinMembers.map((m) => m.user),
    })),
  });
}
