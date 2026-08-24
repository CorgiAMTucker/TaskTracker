import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1).max(60),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { boardId, name } = parsed.data;
  const top = await prisma.column.findFirst({ where: { boardId }, orderBy: { order: "desc" } });

  const column = await prisma.column.create({
    data: { boardId, name, order: (top?.order ?? -1) + 1 },
    select: { id: true, name: true, order: true },
  });

  return NextResponse.json({ column }, { status: 201 });
}
