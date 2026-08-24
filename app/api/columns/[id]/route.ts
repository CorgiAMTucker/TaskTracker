import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(60),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const column = await prisma.column.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true, order: true },
  });

  return NextResponse.json({ column });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const taskCount = await prisma.task.count({ where: { columnId: id } });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `This column still has ${taskCount} task${taskCount === 1 ? "" : "s"} in it. Move or delete them first.` },
      { status: 409 }
    );
  }

  await prisma.column.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
