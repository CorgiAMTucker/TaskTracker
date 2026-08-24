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
};

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  priority: PriorityKey;
  order: number;
  source: "INTERNAL" | "EXTERNAL_FORM";
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterCompany: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  managerId: string | null;
};
