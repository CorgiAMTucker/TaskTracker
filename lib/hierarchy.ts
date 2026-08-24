import { prisma } from "@/lib/prisma";

/** Returns the ids of every user who (directly or indirectly) reports to `userId`. */
export async function getSubordinateIds(userId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    select: { id: true, managerId: true },
  });

  const childrenByManager = new Map<string, string[]>();
  for (const u of users) {
    if (!u.managerId) continue;
    const list = childrenByManager.get(u.managerId) ?? [];
    list.push(u.id);
    childrenByManager.set(u.managerId, list);
  }

  const result: string[] = [];
  const queue = [...(childrenByManager.get(userId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    queue.push(...(childrenByManager.get(id) ?? []));
  }
  return result;
}
