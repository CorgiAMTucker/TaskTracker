import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getNextAssignee } from "@/lib/roundRobin";
import { BROKER_REQUESTS_ENABLED } from "@/lib/featureFlags";

const BOARD_NAME_BY_KIND: Record<"BROKER_REQUEST" | "TASK", string> = {
  BROKER_REQUEST: "Brokering Requests",
  TASK: "AM Tasks",
};

const baseSchema = z.object({
  requestKind: z.enum(["BROKER_REQUEST", "TASK"]),
  preferredAmId: z.string().min(1).optional(),

  // Broker Request fields
  companyName: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  entityFein: z.string().optional(),
  descriptionOfOperations: z.string().optional(),
  atlasLink: z.string().optional(),
  coverageRequested: z.string().optional(),
  limitsRequested: z.string().optional(),
  questionnaireFileUrl: z.string().optional(),
  questionnaireFileName: z.string().optional(),

  // Task fields
  taskKind: z.enum(["ENDORSEMENT", "CUSTOMER_QUESTION", "OTHER"]).optional(),
  descriptionOfTask: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = baseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;

  if (d.requestKind === "BROKER_REQUEST" && !BROKER_REQUESTS_ENABLED) {
    return NextResponse.json(
      { error: "Broker Request submissions are temporarily disabled" },
      { status: 400 }
    );
  }

  // Basic Users are the closest thing to the old external submitter, so they
  // still face the full required-field list. AMs/Admins filing internally
  // can submit with nothing filled in.
  if (session.role === "REQUESTER") {
    if (d.requestKind === "BROKER_REQUEST") {
      const required: [unknown, string][] = [
        [d.companyName, "Company Name"],
        [d.contactFirstName, "Contact First Name"],
        [d.contactLastName, "Contact Last Name"],
        [d.contactEmail, "Contact Email"],
        [d.contactPhone, "Contact Phone Number"],
        [d.entityFein, "Entity FEIN"],
        [d.descriptionOfOperations, "Description of Operations"],
        [d.atlasLink, "Atlas Link"],
        [d.coverageRequested, "Coverage Requested"],
        [d.limitsRequested, "Limits Requested"],
        [d.questionnaireFileUrl, "Completed Questionnaire"],
      ];
      const missing = required.filter(([v]) => !v).map(([, label]) => label);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required field(s): ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    } else {
      const required: [unknown, string][] = [
        [d.taskKind, "Task Type"],
        [d.descriptionOfTask, "Description of Task"],
      ];
      const missing = required.filter(([v]) => !v).map(([, label]) => label);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required field(s): ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }
  }

  const boardName = BOARD_NAME_BY_KIND[d.requestKind];
  const board = await prisma.board.findFirst({ where: { name: boardName } });
  if (!board) {
    return NextResponse.json({ error: `Board "${boardName}" not found` }, { status: 400 });
  }
  const firstColumn = await prisma.column.findFirst({
    where: { boardId: board.id },
    orderBy: { order: "asc" },
  });
  if (!firstColumn) {
    return NextResponse.json({ error: "That board has no columns to file into" }, { status: 400 });
  }

  let preferredAmId: string | null = null;
  if (d.preferredAmId) {
    const member = await prisma.roundRobinMember.findFirst({
      where: { boardId: board.id, userId: d.preferredAmId, active: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Preferred AM is not available on this board" }, { status: 400 });
    }
    preferredAmId = d.preferredAmId;
  }

  const title =
    d.requestKind === "BROKER_REQUEST"
      ? d.companyName || "New broker request"
      : d.descriptionOfTask?.slice(0, 80) || "New task";

  const description =
    d.requestKind === "BROKER_REQUEST" ? d.descriptionOfOperations : d.descriptionOfTask;

  const task = await prisma.$transaction(async (tx) => {
    const assigneeId = preferredAmId ?? (await getNextAssignee(tx, board.id));
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
        requestKind: d.requestKind,
        taskKind: d.requestKind === "TASK" ? d.taskKind : undefined,
        source: "EXTERNAL_FORM",
        createdById: session.sub,
        assigneeId,
        requesterFirstName: d.contactFirstName,
        requesterLastName: d.contactLastName,
        requesterEmail: d.contactEmail,
        requesterPhone: d.contactPhone,
        requesterCompany: d.companyName,
        entityFein: d.entityFein,
        atlasLink: d.atlasLink,
        coverageRequested: d.coverageRequested,
        limitsRequested: d.limitsRequested,
        questionnaireFileUrl: d.questionnaireFileUrl,
        questionnaireFileName: d.questionnaireFileName,
        order: (top?.order ?? -1) + 1,
      },
    });
  });

  return NextResponse.json({ taskId: task.id }, { status: 201 });
}
