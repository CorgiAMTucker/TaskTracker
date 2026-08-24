import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { order: "asc" },
    include: {
      columns: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true } },
    },
  });
  return NextResponse.json({ boards });
}
