import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const reorderSchema = z.object({
  boardId: z.string().min(1),
  columnIds: z.array(z.string().min(1)),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.columnIds.map((id, index) =>
      prisma.column.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
