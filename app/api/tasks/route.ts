import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubordinateIds } from "@/lib/hierarchy";

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json({ error: "boardId is required" }, { status: 400 });
  }
  const filter = searchParams.get("filter") ?? "all";
  const userId = searchParams.get("userId");

  let assigneeFilter: string[] | undefined;

  if (filter === "mine") {
    assigneeFilter = [session.sub];
  } else if (filter === "team") {
    assigneeFilter = await getSubordinateIds(session.sub);
    if (assigneeFilter.length === 0) {
      return NextResponse.json({ tasks: [] });
    }
  } else if (filter === "user" && userId) {
    assigneeFilter = [userId];
  }

  const tasks = await prisma.task.findMany({
    where: {
      column: { boardId },
      ...(assigneeFilter ? { assigneeId: { in: assigneeFilter } } : {}),
    },
    include: taskInclude,
    orderBy: [{ columnId: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ tasks });
}
