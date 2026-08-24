import type { Prisma } from "@/generated/prisma/client";

function cursorKey(boardId: string) {
  return `roundRobinCursor:${boardId}`;
}

/**
 * Picks the next active round-robin member (for this board) after the stored
 * cursor (wrapping around) and advances the cursor. Must be called inside a
 * transaction that also creates the task, so concurrent submissions don't
 * race for the cursor.
 */
export async function getNextAssignee(
  tx: Prisma.TransactionClient,
  boardId: string
): Promise<string | null> {
  const members = await tx.roundRobinMember.findMany({
    where: { boardId, active: true },
    orderBy: { order: "asc" },
  });
  if (members.length === 0) return null;

  const key = cursorKey(boardId);
  const cursor = await tx.setting.findUnique({ where: { key } });
  let nextIndex = 0;
  if (cursor) {
    const currentIndex = members.findIndex((m) => m.userId === cursor.value);
    if (currentIndex !== -1) nextIndex = (currentIndex + 1) % members.length;
  }

  const next = members[nextIndex];
  await tx.setting.upsert({
    where: { key },
    update: { value: next.userId },
    create: { key, value: next.userId },
  });

  return next.userId;
}
