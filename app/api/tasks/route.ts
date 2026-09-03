import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubordinateIds } from "@/lib/hierarchy";
import { PRIORITIES } from "@/lib/statuses";

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

const createSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  columnId: z.string().min(1).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "REQUESTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { boardId, title, description, columnId, priority, assigneeId } = parsed.data;

  let targetColumnId = columnId;
  if (!targetColumnId) {
    const firstColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { order: "asc" },
    });
    if (!firstColumn) {
      return NextResponse.json({ error: "This board has no columns yet" }, { status: 400 });
    }
    targetColumnId = firstColumn.id;
  } else {
    const column = await prisma.column.findUnique({ where: { id: targetColumnId } });
    if (!column || column.boardId !== boardId) {
      return NextResponse.json({ error: "Invalid column for this board" }, { status: 400 });
    }
  }

  const top = await prisma.task.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      columnId: targetColumnId,
      priority: priority ?? "MEDIUM",
      assigneeId: assigneeId || null,
      createdById: session.sub,
      source: "INTERNAL",
      order: (top?.order ?? -1) + 1,
    },
    include: taskInclude,
  });

  return NextResponse.json({ task }, { status: 201 });
}
