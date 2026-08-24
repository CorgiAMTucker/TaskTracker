import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PRIORITIES } from "@/lib/statuses";
import type { Prisma } from "@/generated/prisma/client";

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  columnId: z.string().min(1).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  order: z.number().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id }, include: { column: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, description, columnId, priority, assigneeId, order } = parsed.data;

  if (columnId !== undefined) {
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column || column.boardId !== existing.column.boardId) {
      return NextResponse.json({ error: "Invalid column for this board" }, { status: 400 });
    }
  }
  const data: Prisma.TaskUncheckedUpdateInput = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(columnId !== undefined && { columnId }),
    ...(priority !== undefined && { priority }),
    ...(assigneeId !== undefined && { assigneeId }),
    ...(order !== undefined && { order }),
  };

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
