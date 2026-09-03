import type { PriorityKey } from "@/lib/statuses";

export type ColumnDTO = {
  id: string;
  name: string;
  order: number;
};

export type BoardDTO = {
  id: string;
  name: string;
  order: number;
  columns: ColumnDTO[];
  availableAMs?: { id: string; name: string }[];
};

export type RequestKind = "BROKER_REQUEST" | "TASK";
export type TaskKind = "ENDORSEMENT" | "CUSTOMER_QUESTION" | "OTHER";

export type NoteDTO = {
  id: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
};

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  priority: PriorityKey;
  order: number;
  source: "INTERNAL" | "EXTERNAL_FORM";
  requestKind: RequestKind;
  taskKind: TaskKind | null;
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  requesterName: string | null;
  requesterFirstName: string | null;
  requesterLastName: string | null;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requesterCompany: string | null;
  entityFein: string | null;
  atlasLink: string | null;
  coverageRequested: string | null;
  limitsRequested: string | null;
  questionnaireFileUrl: string | null;
  questionnaireFileName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "REQUESTER";
  managerId: string | null;
};
