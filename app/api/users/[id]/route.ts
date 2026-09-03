import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "MEMBER", "REQUESTER"]).optional(),
  managerId: z.string().min(1).nullable().optional(),
  password: z.string().min(8).max(200).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.managerId === id) {
    return NextResponse.json({ error: "A user cannot manage themselves" }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password
        ? { passwordHash: await hashPassword(password), mustChangePassword: true }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true, managerId: true },
  });

  return NextResponse.json({ user });
}
