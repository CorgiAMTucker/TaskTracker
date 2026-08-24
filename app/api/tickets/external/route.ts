import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getNextAssignee } from "@/lib/roundRobin";
import { PRIORITIES } from "@/lib/statuses";

const bodySchema = z.object({
  boardId: z.string().min(1),
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email(),
  requesterCompany: z.string().max(200).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(PRIORITIES).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const {
    boardId,
    requesterName,
    requesterEmail,
    requesterCompany,
    title,
    description,
    priority,
  } = parsed.data;

  const firstColumn = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: "asc" },
  });
  if (!firstColumn) {
    return NextResponse.json({ error: "That board has no columns to file into" }, { status: 400 });
  }

  const task = await prisma.$transaction(async (tx) => {
    const assigneeId = await getNextAssignee(tx, boardId);
    const top = await tx.task.findFirst({
      where: { columnId: firstColumn.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    return tx.task.create({
      data: {
        title,
        description,
        columnId: firstColumn.id,
        priority: priority ?? "MEDIUM",
        source: "EXTERNAL_FORM",
        requesterName,
        requesterEmail,
        requesterCompany,
        assigneeId,
        order: (top?.order ?? -1) + 1,
      },
    });
  });

  return NextResponse.json({ ticketId: task.id }, { status: 201 });
}
