"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { BoardDTO, ColumnDTO, TaskDTO, UserDTO } from "@/lib/types";
import TopNav from "@/app/components/TopNav";
import TaskDialog from "./TaskDialog";

type FilterValue = "all" | "mine" | "team" | `user:${string}`;

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

function groupByColumn(
  tasks: TaskDTO[],
  columns: ColumnDTO[]
): Record<string, TaskDTO[]> {
  const grouped: Record<string, TaskDTO[]> = {};
  for (const col of columns) grouped[col.id] = [];
  for (const task of tasks) {
    if (!grouped[task.columnId]) grouped[task.columnId] = [];
    grouped[task.columnId].push(task);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.order - b.order);
  }
  return grouped;
}

function findContainer(
  columns: Record<string, TaskDTO[]>,
  taskId: string
): string | undefined {
  return Object.keys(columns).find((key) => columns[key].some((t) => t.id === taskId));
}

export default function BoardClient({
  currentUser,
  users,
  initialBoards,
}: {
  currentUser: { id: string; name: string; role: "ADMIN" | "MEMBER" | "REQUESTER" };
  users: UserDTO[];
  initialBoards: BoardDTO[];
}) {
  const [boards, setBoards] = useState<BoardDTO[]>(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string>(initialBoards[0]?.id ?? "");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [columns, setColumns] = useState<Record<string, TaskDTO[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const [dialogTask, setDialogTask] = useState<TaskDTO | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [columnError, setColumnError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reassignTo, setReassignTo] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function refreshBoards() {
    const res = await fetch("/api/boards");
    const data = await res.json();
    setBoards(data.boards ?? []);
  }

  async function loadTasks() {
    if (!activeBoardId || !activeBoard) return;
    setLoading(true);
    const params = new URLSearchParams({ boardId: activeBoardId });
    if (filter === "mine") params.set("filter", "mine");
    else if (filter === "team") params.set("filter", "team");
    else if (filter.startsWith("user:")) {
      params.set("filter", "user");
      params.set("userId", filter.slice(5));
    }
    const res = await fetch(`/api/tasks?${params.toString()}`);
    const data = await res.json();
    setColumns(groupByColumn(data.tasks ?? [], activeBoard.columns));
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeBoardId, boards]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [activeBoardId]);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const container = findContainer(columns, id);
    if (!container) return;
    setActiveTask(columns[container].find((t) => t.id === id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !activeBoard) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(columns, activeId);
    const overContainer =
      (activeBoard.columns.find((c) => c.id === overId)?.id) ??
      findContainer(columns, overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      const overIndex = overItems.findIndex((t) => t.id === overId);

      const movedTask = { ...activeItems[activeIndex], columnId: overContainer };
      const newActiveItems = activeItems.filter((t) => t.id !== activeId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        movedTask,
        ...overItems.slice(insertAt),
      ];

      return {
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      };
    });
  }

  async function persistColumn(columnId: string, tasks: TaskDTO[]) {
    await Promise.all(
      tasks.map((task, index) =>
        fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId, order: index }),
        })
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !activeBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const container = findContainer(columns, activeId);
    if (!container) return;

    const overContainer =
      (activeBoard.columns.find((c) => c.id === overId)?.id) ??
      findContainer(columns, overId);
    if (!overContainer) return;

    setColumns((prev) => {
      const items = prev[container];
      const activeIndex = items.findIndex((t) => t.id === activeId);
      const overIndex = items.findIndex((t) => t.id === overId);
      let reordered = items;
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        reordered = [...items];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, moved);
      }
      const next = { ...prev, [container]: reordered };
      persistColumn(container, reordered);
      return next;
    });
  }

  function handleTaskSaved(task: TaskDTO) {
    setColumns((prev) => {
      const withoutTask = Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v.filter((t) => t.id !== task.id)])
      );
      return {
        ...withoutTask,
        [task.columnId]: [...(withoutTask[task.columnId] ?? []), task],
      };
    });
  }

  async function handleDelete(taskId: string, columnId: string) {
    setColumns((prev) => ({
      ...prev,
      [columnId]: prev[columnId].filter((t) => t.id !== taskId),
    }));
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  }

  function handleTaskDeletedLocally(taskId: string) {
    setColumns((prev) =>
      Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((t) => t.id !== taskId)]))
    );
  }

  async function handleRenameColumn(columnId: string, name: string) {
    await fetch(`/api/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await refreshBoards();
  }

  async function handleDeleteColumn(columnId: string) {
    setColumnError(null);
    const res = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setColumnError(data.error ?? "Couldn't delete that column");
      return;
    }
    await refreshBoards();
  }

  async function handleMoveColumn(columnId: string, direction: -1 | 1) {
    if (!activeBoard) return;
    const cols = [...activeBoard.columns].sort((a, b) => a.order - b.order);
    const index = cols.findIndex((c) => c.id === columnId);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= cols.length) return;
    [cols[index], cols[swapWith]] = [cols[swapWith], cols[index]];

    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId
          ? { ...b, columns: cols.map((c, i) => ({ ...c, order: i })) }
          : b
      )
    );

    await fetch("/api/columns/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: activeBoardId, columnIds: cols.map((c) => c.id) }),
    });
  }

  function toggleSelected(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function handleBulkReassign() {
    if (selectedIds.size === 0) return;
    setReassigning(true);
    const assigneeId = reassignTo || null;
    const ids = [...selectedIds];
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assigneeId }),
          })
        )
      );
      setColumns((prev) => {
        const next: Record<string, TaskDTO[]> = {};
        const assignee = users.find((u) => u.id === assigneeId) ?? null;
        for (const [colId, tasks] of Object.entries(prev)) {
          next[colId] = tasks.map((t) =>
            selectedIds.has(t.id)
              ? { ...t, assignee: assignee ? { id: assignee.id, name: assignee.name } : null }
              : t
          );
        }
        return next;
      });
      setSelectedIds(new Set());
      setSelectMode(false);
      setReassignTo("");
    } finally {
      setReassigning(false);
    }
  }

  async function handleAddColumn() {
    const name = window.prompt("New column name:");
    if (!name) return;
    const res = await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: activeBoardId, name }),
    });
    if (res.ok) await refreshBoards();
  }

  const isAdmin = currentUser.role === "ADMIN";
  const isReadOnly = currentUser.role === "REQUESTER";

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav currentUser={currentUser} />

      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-3">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBoardId(b.id);
              setEditMode(false);
              setColumnError(null);
            }}
            className={`rounded-t-md px-4 py-2 text-sm font-medium ${
              b.id === activeBoardId
                ? "border border-b-0 border-slate-200 bg-white text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <FilterButton value="all" current={filter} onClick={setFilter} label="All tasks" />
          <FilterButton value="mine" current={filter} onClick={setFilter} label="My tasks" />
          <FilterButton value="team" current={filter} onClick={setFilter} label="My team" />
          <select
            value={filter.startsWith("user:") ? filter : ""}
            onChange={(e) =>
              setFilter(e.target.value ? (e.target.value as FilterValue) : "all")
            }
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600"
          >
            <option value="">Specific person…</option>
            {users.map((u) => (
              <option key={u.id} value={`user:${u.id}`}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                setEditMode((v) => !v);
                setColumnError(null);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                editMode
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {editMode ? "Done editing" : "Edit columns"}
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds(new Set());
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                selectMode
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {selectMode ? "Done selecting" : "Select"}
            </button>
          )}
          <Link
            href="/request"
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            New Request
          </Link>
        </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-lg">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} selected
          </span>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkReassign}
            disabled={reassigning}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {reassigning ? "Reassigning…" : "Reassign"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Clear
          </button>
        </div>
      )}

      {columnError && (
        <p className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-600">
          {columnError}
        </p>
      )}

      <main className="flex-1 overflow-x-auto p-6">
        {loading || !activeBoard ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4">
              {[...activeBoard.columns]
                .sort((a, b) => a.order - b.order)
                .map((col, i, arr) => (
                  <Column
                    key={col.id}
                    column={col}
                    tasks={columns[col.id] ?? []}
                    usersById={usersById}
                    onDelete={handleDelete}
                    onEdit={(task) => setDialogTask(task)}
                    editMode={editMode}
                    onRename={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onMoveLeft={() => handleMoveColumn(col.id, -1)}
                    onMoveRight={() => handleMoveColumn(col.id, 1)}
                    isFirst={i === 0}
                    isLast={i === arr.length - 1}
                    selectMode={selectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelected}
                    readOnly={isReadOnly}
                  />
                ))}
              {editMode && (
                <button
                  onClick={handleAddColumn}
                  className="flex h-12 w-56 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600"
                >
                  + Add column
                </button>
              )}
            </div>
            <DragOverlay>
              {activeTask ? (
                <TaskCard
                  task={activeTask}
                  assigneeName={
                    activeTask.assignee ? usersById[activeTask.assignee.id]?.name : undefined
                  }
                  onDelete={() => {}}
                  onEdit={() => {}}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {activeBoard && dialogTask && (
        <TaskDialog
          task={dialogTask}
          onClose={() => setDialogTask(null)}
          users={users}
          columns={activeBoard.columns}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeletedLocally}
          readOnly={isReadOnly}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function FilterButton({
  value,
  current,
  onClick,
  label,
}: {
  value: FilterValue;
  current: FilterValue;
  onClick: (v: FilterValue) => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function Column({
  column,
  tasks,
  usersById,
  onDelete,
  onEdit,
  editMode,
  onRename,
  onDeleteColumn,
  onMoveLeft,
  onMoveRight,
  isFirst,
  isLast,
  selectMode,
  selectedIds,
  onToggleSelect,
  readOnly,
}: {
  column: ColumnDTO;
  tasks: TaskDTO[];
  usersById: Record<string, UserDTO>;
  onDelete: (taskId: string, columnId: string) => void;
  onEdit: (task: TaskDTO) => void;
  editMode: boolean;
  onRename: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  isFirst: boolean;
  isLast: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
  readOnly: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);

  useEffect(() => setName(column.name), [column.name]);

  function submitRename() {
    setRenaming(false);
    if (name.trim() && name.trim() !== column.name) {
      onRename(column.id, name.trim());
    } else {
      setName(column.name);
    }
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-slate-200/60">
      <div className="flex items-center justify-between gap-1 px-3 py-2">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") {
                setName(column.name);
                setRenaming(false);
              }
            }}
            className="w-full rounded border border-slate-300 px-1 py-0.5 text-sm font-semibold"
          />
        ) : (
          <h2
            className={`truncate text-sm font-semibold text-slate-700 ${editMode ? "cursor-pointer hover:underline" : ""}`}
            onClick={() => editMode && setRenaming(true)}
          >
            {column.name}
          </h2>
        )}
        <div className="flex items-center gap-1">
          {!editMode && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
              {tasks.length}
            </span>
          )}
          {editMode && (
            <>
              <button
                onClick={onMoveLeft}
                disabled={isFirst}
                className="rounded px-1 text-xs text-slate-500 hover:bg-slate-300 disabled:opacity-30"
              >
                ←
              </button>
              <button
                onClick={onMoveRight}
                disabled={isLast}
                className="rounded px-1 text-xs text-slate-500 hover:bg-slate-300 disabled:opacity-30"
              >
                →
              </button>
              <button
                onClick={() => onDeleteColumn(column.id)}
                className="rounded px-1 text-xs text-red-500 hover:bg-red-100"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
      <div ref={setNodeRef} className="flex-1 space-y-2 px-2 pb-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              assigneeName={task.assignee ? usersById[task.assignee.id]?.name : undefined}
              onDelete={() => onDelete(task.id, column.id)}
              onEdit={() => onEdit(task)}
              selectMode={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={() => onToggleSelect(task.id)}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  assigneeName,
  onDelete,
  onEdit,
  selectMode,
  selected,
  onToggleSelect,
  readOnly,
}: {
  task: TaskDTO;
  assigneeName?: string;
  onDelete: () => void;
  onEdit: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: selectMode || readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(selectMode || readOnly ? {} : { ...attributes, ...listeners })}
    >
      <TaskCard
        task={task}
        assigneeName={assigneeName}
        onDelete={onDelete}
        onEdit={onEdit}
        selectMode={selectMode}
        selected={selected}
        onToggleSelect={onToggleSelect}
        readOnly={readOnly}
      />
    </div>
  );
}

function TaskCard({
  task,
  assigneeName,
  onDelete,
  onEdit,
  selectMode,
  selected,
  onToggleSelect,
  readOnly,
}: {
  task: TaskDTO;
  assigneeName?: string;
  onDelete: () => void;
  onEdit: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      onClick={selectMode ? onToggleSelect : onEdit}
      className={`group rounded-md border bg-white p-3 shadow-sm ${
        readOnly ? "cursor-default" : "cursor-pointer"
      } ${selected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {selectMode && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
          )}
          <p className="text-sm font-medium text-slate-900">{task.title}</p>
        </div>
        {!selectMode && !readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="hidden text-xs text-slate-400 hover:text-red-500 group-hover:block"
          >
            ✕
          </button>
        )}
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.source === "EXTERNAL_FORM" && (
          <span
            className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700"
            title={`Filed by ${
              [task.requesterFirstName, task.requesterLastName].filter(Boolean).join(" ") ||
              task.requesterName ||
              "external requester"
            }${task.requesterCompany ? ` (${task.requesterCompany})` : ""}`}
          >
            External
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {assigneeName ?? "Unassigned"}
      </p>
    </div>
  );
}
