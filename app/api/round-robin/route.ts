import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");
  if (!boardId) return NextResponse.json({ error: "boardId is required" }, { status: 400 });

  const members = await prisma.roundRobinMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ members });
}

const addSchema = z.object({ boardId: z.string().min(1), userId: z.string().min(1) });

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { boardId, userId } = parsed.data;

  const existing = await prisma.roundRobinMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already in this board's rotation" }, { status: 409 });
  }

  const top = await prisma.roundRobinMember.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
  });
  const member = await prisma.roundRobinMember.create({
    data: { boardId, userId, order: (top?.order ?? -1) + 1 },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ member }, { status: 201 });
}

const reorderSchema = z.object({ memberIds: z.array(z.string().min(1)) });

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.memberIds.map((id, index) =>
      prisma.roundRobinMember.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
