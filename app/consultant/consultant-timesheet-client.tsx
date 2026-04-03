"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadConsultantWeeklyTimesheetAction,
  saveConsultantTimesheetDraftAction,
  submitConsultantTimesheetAction,
} from "./actions";
import { cn } from "@/lib/utils";
import type {
  WeeklyTimesheetEntry,
  WeeklyTimesheetRecord,
  WeeklyTimesheetTask,
} from "@/services/consultant-service";

type ConsultantTimesheetClientProps = {
  initialTimesheet: WeeklyTimesheetRecord;
  initialError: string | null;
};

type PendingTaskDraft = {
  title: string;
  hours: string;
  attemptedSubmit: boolean;
};

function buildTaskId(entryDate: string, taskIndex: number): string {
  return `task-${entryDate}-${taskIndex + 1}`;
}

function buildTaskDraftKey(entryIndex: number, taskId: string): string {
  return `${entryIndex}:${taskId}`;
}

function normalizeTask(task: WeeklyTimesheetTask, taskIndex: number, entryDate: string): WeeklyTimesheetTask {
  return {
    id: task.id.trim().length > 0 ? task.id : buildTaskId(entryDate, taskIndex),
    title: task.title,
    hours: Number.isFinite(task.hours) ? task.hours : 0,
  };
}

function sumTaskHours(tasks: WeeklyTimesheetTask[]): number {
  return tasks.reduce((sum, task) => sum + (Number.isFinite(task.hours) ? task.hours : 0), 0);
}

function constrainTaskHours(
  tasks: WeeklyTimesheetTask[],
  entryDate: string,
): WeeklyTimesheetTask[] {
  let remainingHours = 24;

  return tasks.map((task, taskIndex) => {
    const normalizedHours = Number.isFinite(task.hours) ? Math.max(0, task.hours) : 0;
    const constrainedHours = Math.min(normalizedHours, remainingHours);
    remainingHours -= constrainedHours;

    return {
      ...normalizeTask(task, taskIndex, entryDate),
      hours: constrainedHours,
    };
  });
}

function getTaskHoursLimit(
  tasks: WeeklyTimesheetTask[],
  excludedTaskIndex?: number,
): number {
  const otherTaskHours = tasks.reduce((sum, task, taskIndex) => {
    if (taskIndex === excludedTaskIndex) return sum;
    return sum + (Number.isFinite(task.hours) ? task.hours : 0);
  }, 0);

  return Math.max(0, 24 - otherTaskHours);
}

function buildDefaultTask(entry: WeeklyTimesheetEntry): WeeklyTimesheetTask {
  return {
    id: buildTaskId(entry.date, 0),
    title: "Task 1",
    hours: Number.isFinite(entry.hours) ? entry.hours : 0,
  };
}

function normalizeEntryTasks(entry: WeeklyTimesheetEntry): WeeklyTimesheetTask[] {
  const existingTasks = entry.tasks?.length ? entry.tasks : [];

  if (existingTasks.length > 0) {
    return existingTasks.map((task, taskIndex) => normalizeTask(task, taskIndex, entry.date));
  }

  if ((Number.isFinite(entry.hours) ? entry.hours : 0) > 0) {
    return [buildDefaultTask(entry)];
  }

  return [];
}

function syncEntryTasks(entry: WeeklyTimesheetEntry): WeeklyTimesheetEntry {
  const tasks = constrainTaskHours(normalizeEntryTasks(entry), entry.date);
  return {
    ...entry,
    tasks,
    hours: tasks.length > 0 ? sumTaskHours(tasks) : Number.isFinite(entry.hours) ? entry.hours : 0,
  };
}

function prepareTimesheetEntries(entries: WeeklyTimesheetEntry[]): WeeklyTimesheetEntry[] {
  return entries.map((entry) => syncEntryTasks(entry));
}

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function applyProjectCodeToEntries(
  entries: WeeklyTimesheetEntry[],
  projectCode: string,
): WeeklyTimesheetEntry[] {
  const normalizedProjectCode = normalizeProjectCode(projectCode);
  return entries.map((entry) => ({
    ...entry,
    projectCode: normalizedProjectCode,
  }));
}

function resolveSelectedProjectCode(
  timesheet: WeeklyTimesheetRecord,
): string {
  const firstEntryProjectCode = timesheet.entries.find(
    (entry) => normalizeProjectCode(entry.projectCode).length > 0,
  )?.projectCode;

  const normalizedEntryProjectCode = firstEntryProjectCode
    ? normalizeProjectCode(firstEntryProjectCode)
    : "";

  if (normalizedEntryProjectCode) {
    return normalizedEntryProjectCode;
  }

  return "";
}

function initializeTimesheet(
  timesheet: WeeklyTimesheetRecord,
): WeeklyTimesheetRecord {
  const selectedProjectCode = resolveSelectedProjectCode(timesheet);
  const entries = prepareTimesheetEntries(timesheet.entries);

  return {
    ...timesheet,
    entries: selectedProjectCode
      ? applyProjectCodeToEntries(entries, selectedProjectCode)
      : entries,
  };
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ConsultantTimesheetClient({
  initialTimesheet,
  initialError,
}: ConsultantTimesheetClientProps) {
  const router = useRouter();
  const [timesheet, setTimesheet] = useState(() =>
    initializeTimesheet(initialTimesheet),
  );
  const [selectedProjectCode, setSelectedProjectCode] = useState(() =>
    resolveSelectedProjectCode(initialTimesheet),
  );
  const [expandedEntryIndex, setExpandedEntryIndex] = useState<number | null>(null);
  const [taskHoursDraftByKey, setTaskHoursDraftByKey] = useState<Record<string, string>>({});
  const [pendingTaskDraftByEntry, setPendingTaskDraftByEntry] = useState<
    Record<number, PendingTaskDraft>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSubmitted = timesheet.status === "submitted";

  const totalHours = useMemo(
    () =>
      timesheet.entries.reduce((sum, entry) => {
        const normalizedHours = Number.isFinite(entry.hours) ? entry.hours : 0;
        return sum + normalizedHours;
      }, 0),
    [timesheet.entries],
  );

  const hasInvalidHours = useMemo(
    () => timesheet.entries.some((entry) => entry.hours < 0 || entry.hours > 24),
    [timesheet.entries],
  );

  const hasProjectCodeValidationError = selectedProjectCode.length === 0;

  function updateEntry(
    index: number,
    patch: Partial<WeeklyTimesheetEntry>,
  ): void {
    if (isSubmitted) return;

    setTimesheet((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function updateEntryTasks(
    index: number,
    taskUpdater: (tasks: WeeklyTimesheetTask[]) => WeeklyTimesheetTask[],
  ): void {
    if (isSubmitted) return;

    setTimesheet((prev) => {
      const nextEntries = prev.entries.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }

        const nextTasks = taskUpdater(normalizeEntryTasks(entry));
        const normalizedTasks = constrainTaskHours(
          nextTasks.map((task, taskIndex) => normalizeTask(task, taskIndex, entry.date)),
          entry.date,
        );

        return {
          ...entry,
          tasks: normalizedTasks,
          hours: sumTaskHours(normalizedTasks),
        };
      });

      return {
        ...prev,
        entries: nextEntries,
      };
    });
  }

  function openTaskDraft(entryIndex: number): void {
    setPendingTaskDraftByEntry((prev) => ({
      ...prev,
      [entryIndex]:
        prev[entryIndex] ?? {
          title: "",
          hours: "",
          attemptedSubmit: false,
        },
    }));
  }

  function updateTaskDraft(
    entryIndex: number,
    patch: Partial<PendingTaskDraft>,
  ): void {
    setPendingTaskDraftByEntry((prev) => {
      const current =
        prev[entryIndex] ??
        ({ title: "", hours: "", attemptedSubmit: false } satisfies PendingTaskDraft);

      return {
        ...prev,
        [entryIndex]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  function closeTaskDraft(entryIndex: number): void {
    setPendingTaskDraftByEntry((prev) => {
      const next = { ...prev };
      delete next[entryIndex];
      return next;
    });
  }

  function commitTaskDraft(entryIndex: number): void {
    const draft = pendingTaskDraftByEntry[entryIndex];
    if (!draft) return;

    const normalizedTitle = draft.title.trim();
    const hasTitle = normalizedTitle.length > 0;
    const hasHoursText = draft.hours.trim().length > 0;

    if (!hasTitle || !hasHoursText) {
      updateTaskDraft(entryIndex, { attemptedSubmit: true });
      return;
    }

    const parsedHours = Number.parseFloat(draft.hours);
    if (Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > 24) {
      updateTaskDraft(entryIndex, { attemptedSubmit: true });
      return;
    }

    const entryDate = timesheet.entries[entryIndex]?.date;
    if (!entryDate) return;

    updateEntryTasks(entryIndex, (tasks) => [
      ...tasks,
      {
        id: `task-${entryDate}-${Date.now()}`,
        title: normalizedTitle,
        hours: parsedHours,
      },
    ]);

    closeTaskDraft(entryIndex);
  }

  function updateTaskField(
    entryIndex: number,
    taskIndex: number,
    patch: Partial<WeeklyTimesheetTask>,
  ): void {
    updateEntryTasks(entryIndex, (tasks) =>
      tasks.map((task, currentTaskIndex) => {
        if (currentTaskIndex !== taskIndex) {
          return task;
        }

        if (typeof patch.hours === "number") {
          const maxAllowedHours = getTaskHoursLimit(tasks, taskIndex);
          const normalizedHours = Number.isNaN(patch.hours)
            ? 0
            : Math.min(Math.max(patch.hours, 0), maxAllowedHours);

          return {
            ...task,
            ...patch,
            hours: normalizedHours,
          };
        }

        return { ...task, ...patch };
      }),
    );
  }

  function removeTaskFromEntry(entryIndex: number, taskIndex: number): void {
    updateEntryTasks(entryIndex, (tasks) => tasks.filter((_, currentTaskIndex) => currentTaskIndex !== taskIndex));
  }

  function loadWeek(weekStart: string): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    setExpandedEntryIndex(null);
    setPendingTaskDraftByEntry({});

    startTransition(() => {
      loadConsultantWeeklyTimesheetAction(weekStart).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        const nextSelectedProjectCode = resolveSelectedProjectCode(result.timesheet);

        setSelectedProjectCode(nextSelectedProjectCode);
        setTimesheet(initializeTimesheet(result.timesheet));
        router.replace(`/consultant/timesheets/${result.timesheet.id}`);
      });
    });
  }

  function updateWeeklyProjectCode(projectCode: string): void {
    if (isSubmitted) return;

    const normalizedProjectCode = normalizeProjectCode(projectCode);
    setSelectedProjectCode(normalizedProjectCode);
    setTimesheet((prev) => ({
      ...prev,
      entries: applyProjectCodeToEntries(prev.entries, normalizedProjectCode),
    }));
  }

  function saveDraft(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      saveConsultantTimesheetDraftAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: prepareTimesheetEntries(timesheet.entries),
      }).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setSuccessMessage(result.message);
        router.replace(`/consultant/timesheets/${timesheet.id}`);
        router.refresh();
      });
    });
  }

  function submitTimesheet(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      submitConsultantTimesheetAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: prepareTimesheetEntries(timesheet.entries),
      }).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setTimesheet((prev) => ({ ...prev, status: "submitted" }));
        setSuccessMessage(result.message);
        router.replace(`/consultant/timesheets/${timesheet.id}`);
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Weekly Timesheet</CardTitle>
            <CardDescription>
              Enter billable work for the selected week, save as draft, and submit when complete.
            </CardDescription>
          </div>
          <Badge variant={isSubmitted ? "secondary" : "outline"}>
            {isSubmitted ? "Submitted" : "Draft"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="weekStart">
              Week starting
            </label>
            <Input
              id="weekStart"
              type="date"
              value={timesheet.weekStart}
              onChange={(event) => loadWeek(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="projectCode">
              Project code
            </label>
            <Input
              id="projectCode"
              value={selectedProjectCode}
              onChange={(event) => updateWeeklyProjectCode(event.target.value)}
              placeholder="e.g. PROJ-001"
              disabled={isSubmitted || isPending}
            />
          </div>

          <Table className="table-fixed">
            <colgroup>
              <col className="w-[96px]" />
              <col className="w-[76px]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2">Day</TableHead>
                <TableHead className="px-2">Hours</TableHead>
                <TableHead className="px-2 text-left">Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.entries.map((entry, index) => (
                <Fragment key={entry.date}>
                  <TableRow key={entry.date}>
                    <TableCell className="px-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{entry.dayLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="font-medium tabular-nums">
                        {entry.hours.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 align-top whitespace-normal">
                      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <p className="text-xs leading-4 text-muted-foreground whitespace-normal break-words">
                          {(entry.tasks ?? []).length === 0
                            ? "No tasks yet. Add one to break down this day."
                            : `${(entry.tasks ?? []).length} ${(entry.tasks ?? []).length === 1 ? "Task" : "Tasks"}`}
                        </p>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedEntryIndex((currentIndex) =>
                                currentIndex === index ? null : index,
                              )
                            }
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expandedEntryIndex === index && "rotate-180",
                              )}
                            />
                            {expandedEntryIndex === index ? "Hide tasks" : "Tasks"}
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedEntryIndex === index ? (
                    <TableRow>
                      <TableCell colSpan={3} className="bg-muted/30 p-0">
                        <div className="space-y-4 p-4">
                          {(() => {
                            const taskHoursTotal = sumTaskHours(entry.tasks ?? []);
                            const hasTaskCapacity = taskHoursTotal < 24;

                            return (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">Task breakdown</p>
                              <p className="text-xs text-muted-foreground">
                                Task hours total {taskHoursTotal.toFixed(2)} of {entry.hours.toFixed(2)}.
                              </p>
                            </div>
                            {hasTaskCapacity ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openTaskDraft(index)}
                                disabled={isSubmitted || isPending}
                              >
                                <Plus className="h-4 w-4" />
                                Add task
                              </Button>
                            ) : null}
                          </div>
                            );
                          })()}

                          <div className="space-y-3">
                            {(entry.tasks ?? []).map((task, taskIndex) => (
                              <div
                                key={task.id}
                                className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]"
                              >
                                <div className="grid gap-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Task
                                  </label>
                                  <Input
                                    value={task.title}
                                    onChange={(event) =>
                                      updateTaskField(index, taskIndex, {
                                        title: event.target.value,
                                      })
                                    }
                                    placeholder="Describe the task"
                                    disabled={isSubmitted || isPending}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Hours
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={getTaskHoursLimit(entry.tasks ?? [], taskIndex)}
                                    step={0.25}
                                    value={
                                      taskHoursDraftByKey[
                                        buildTaskDraftKey(index, task.id)
                                      ] ?? String(task.hours)
                                    }
                                    onFocus={() => {
                                      const draftKey = buildTaskDraftKey(index, task.id);
                                      setTaskHoursDraftByKey((prev) => ({
                                        ...prev,
                                        [draftKey]: String(task.hours),
                                      }));
                                    }}
                                    onBlur={() => {
                                      const draftKey = buildTaskDraftKey(index, task.id);
                                      const draftValue =
                                        taskHoursDraftByKey[draftKey] ?? String(task.hours);
                                      const normalized = Number.parseFloat(draftValue);

                                      updateTaskField(index, taskIndex, {
                                        hours: Number.isNaN(normalized) ? 0 : normalized,
                                      });

                                      setTaskHoursDraftByKey((prev) => {
                                        const next = { ...prev };
                                        delete next[draftKey];
                                        return next;
                                      });
                                    }}
                                    onChange={(event) => {
                                      const rawValue = event.target.value;
                                      const nextHours = Number.parseFloat(rawValue);
                                      const draftKey = buildTaskDraftKey(index, task.id);

                                      setTaskHoursDraftByKey((prev) => ({
                                        ...prev,
                                        [draftKey]: rawValue,
                                      }));

                                      updateTaskField(index, taskIndex, {
                                        hours: Number.isNaN(nextHours) ? 0 : nextHours,
                                      });
                                    }}
                                    disabled={isSubmitted || isPending}
                                  />
                                </div>
                                <div className="flex items-end justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTaskFromEntry(index, taskIndex)}
                                    disabled={isSubmitted || isPending}
                                    aria-label="Remove task"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}

                            {pendingTaskDraftByEntry[index] ? (
                              <div className="grid gap-3 rounded-lg border border-dashed bg-background p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                                <div className="grid gap-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Task
                                  </label>
                                  <Input
                                    className={cn(
                                      pendingTaskDraftByEntry[index].attemptedSubmit &&
                                        pendingTaskDraftByEntry[index].title.trim().length === 0 &&
                                        "border-destructive",
                                    )}
                                    value={pendingTaskDraftByEntry[index].title}
                                    onChange={(event) =>
                                      updateTaskDraft(index, {
                                        title: event.target.value,
                                      })
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitTaskDraft(index);
                                      }
                                    }}
                                    placeholder="Describe the task"
                                    disabled={isSubmitted || isPending}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Hours
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={getTaskHoursLimit(entry.tasks ?? [])}
                                    step={0.25}
                                    className={cn(
                                      pendingTaskDraftByEntry[index].attemptedSubmit &&
                                        pendingTaskDraftByEntry[index].hours.trim().length === 0 &&
                                        "border-destructive",
                                    )}
                                    value={pendingTaskDraftByEntry[index].hours}
                                    onFocus={() => {
                                      setTaskHoursDraftByKey((prev) => prev);
                                    }}
                                    onChange={(event) =>
                                      updateTaskDraft(index, {
                                        hours: event.target.value,
                                      })
                                    }
                                    onBlur={() => {
                                      const currentDraft = pendingTaskDraftByEntry[index];
                                      const normalizedHours = Number.parseFloat(currentDraft.hours);
                                      const availableHours = getTaskHoursLimit(entry.tasks ?? []);

                                      if (currentDraft.hours.trim().length === 0) {
                                        return;
                                      }

                                      updateTaskDraft(index, {
                                        hours: Number.isNaN(normalizedHours)
                                          ? currentDraft.hours
                                          : String(Math.min(Math.max(normalizedHours, 0), availableHours)),
                                      });
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitTaskDraft(index);
                                      }
                                    }}
                                    disabled={isSubmitted || isPending}
                                  />
                                </div>
                                <div className="flex items-end justify-end gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => commitTaskDraft(index)}
                                    disabled={isSubmitted || isPending}
                                  >
                                    Enter
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => closeTaskDraft(index)}
                                    disabled={isSubmitted || isPending}
                                    aria-label="Cancel task"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Week range: {formatDate(timesheet.weekStart)} to {formatDate(timesheet.weekEnd)}
            </div>
            <div className="text-sm font-semibold">Total hours: {totalHours.toFixed(2)}</div>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {hasProjectCodeValidationError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Select a project code for this weekly timesheet.
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={
                isPending ||
                isSubmitted ||
                hasInvalidHours ||
                hasProjectCodeValidationError
              }
            >
              Save Draft
            </Button>
            <Button
              onClick={submitTimesheet}
              disabled={
                isPending ||
                isSubmitted ||
                hasInvalidHours ||
                hasProjectCodeValidationError ||
                totalHours <= 0
              }
            >
              Submit Timesheet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
