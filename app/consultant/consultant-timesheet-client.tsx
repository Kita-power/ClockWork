"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadConsultantWeeklyDraftTimesheetAction,
  loadConsultantWeeklyTimesheetAction,
  saveConsultantTimesheetDraftAction,
  submitConsultantTimesheetAction,
} from "./actions";
import { cn } from "@/lib/utils";
import {
  appendNotification,
  createTimesheetSubmittedNotification,
} from "@/lib/notification-center";
import {
  formatConsultantTimesheetStatusLabel,
  getConsultantTimesheetDisplayStatus,
} from "@/lib/consultant-timesheet-status";
import type {
  ConsultantAssignedProject,
  WeeklyTimesheetEntry,
  WeeklyTimesheetRecord,
  WeeklyTimesheetTask,
} from "@/services/consultant-service";

type ConsultantTimesheetClientProps = {
  initialTimesheet: WeeklyTimesheetRecord;
  assignedProjects: ConsultantAssignedProject[];
  initialError: string | null;
  loadSubmittedOnWeekChange?: boolean;
  useNewRouteForDrafts?: boolean;
};

type PendingTaskDraft = {
  title: string;
  hours: string;
  attemptedSubmit: boolean;
};

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPendingTaskDraftHoursInvalid(draft: PendingTaskDraft): boolean {
  if (draft.hours.trim().length === 0) {
    return true;
  }

  const parsedHours = Number.parseFloat(draft.hours);
  return Number.isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24;
}

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
    hours: Number.isFinite(task.hours) ? roundToTwoDecimals(task.hours) : 0,
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

function buildTimesheetSnapshot(
  timesheet: WeeklyTimesheetRecord,
  selectedProjectCode: string,
): string {
  return JSON.stringify({
    id: timesheet.id,
    weekStart: timesheet.weekStart,
    weekEnd: timesheet.weekEnd,
    projectCode: normalizeProjectCode(selectedProjectCode),
    entries: prepareTimesheetEntries(timesheet.entries).map((entry) => ({
      date: entry.date,
      dayLabel: entry.dayLabel,
      projectCode: normalizeProjectCode(entry.projectCode),
      hours: Number.isFinite(entry.hours) ? entry.hours : 0,
      notes: (entry.notes ?? "").trim(),
      tasks: (entry.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title.trim(),
        hours: Number.isFinite(task.hours) ? task.hours : 0,
      })),
    })),
  });
}

function cloneTimesheetRecord(timesheet: WeeklyTimesheetRecord): WeeklyTimesheetRecord {
  return {
    ...timesheet,
    entries: timesheet.entries.map((entry) => ({
      ...entry,
      tasks: (entry.tasks ?? []).map((task) => ({ ...task })),
    })),
  };
}

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMondayLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildMondayOptions(anchorWeekStart: string): Array<{ value: string; label: string }> {
  const anchorDate = new Date(`${anchorWeekStart}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 105 }, (_, index) => {
    const monday = addDays(anchorDate, (index - 52) * 7);
    const value = toIsoDate(monday);

    return {
      value,
      label: formatMondayLabel(value),
    };
  }).filter((option) => {
    const optionDate = new Date(`${option.value}T00:00:00`);
    return optionDate <= today;
  });
}

function buildClearedEntries(weekStart: string): WeeklyTimesheetEntry[] {
  const startDate = new Date(`${weekStart}T00:00:00`);

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = addDays(startDate, index);
    return {
      date: toIsoDate(currentDate),
      dayLabel: currentDate.toLocaleDateString("en-US", { weekday: "short" }),
      projectCode: "",
      hours: 0,
      notes: "",
      tasks: [],
    };
  });
}

function buildClearedTimesheet(timesheet: WeeklyTimesheetRecord): WeeklyTimesheetRecord {
  return {
    ...timesheet,
    entries: buildClearedEntries(timesheet.weekStart),
  };
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

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadgeClassName(status: string): string {
  if (status === "approved" || status === "approved_late") {
    return "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "processed") {
    return "border-sky-600/30 bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (status === "submitted" || status === "submitted_late") {
    return "border-blue-600/30 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (status === "rejected") {
    return "border-rose-600/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }
  if (status === "overdue") {
    return "border-red-600/30 bg-red-500/15 text-red-700 dark:text-red-300";
  }
  return "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

export function ConsultantTimesheetClient({
  initialTimesheet,
  assignedProjects,
  initialError,
  loadSubmittedOnWeekChange = true,
  useNewRouteForDrafts = false,
}: ConsultantTimesheetClientProps) {
  const router = useRouter();
  const initialNormalizedTimesheet = useMemo(
    () => initializeTimesheet(initialTimesheet),
    [initialTimesheet],
  );
  const initialSelectedProjectCode = useMemo(
    () => resolveSelectedProjectCode(initialTimesheet),
    [initialTimesheet],
  );
  const [timesheet, setTimesheet] = useState(() =>
    initialNormalizedTimesheet,
  );
  const [selectedProjectCode, setSelectedProjectCode] = useState(() =>
    initialSelectedProjectCode,
  );
  const [expandedEntryIndex, setExpandedEntryIndex] = useState<number | null>(null);
  const [taskHoursDraftByKey, setTaskHoursDraftByKey] = useState<Record<string, string>>({});
  const [editingTaskByKey, setEditingTaskByKey] = useState<Record<string, boolean>>({});
  const [invalidEditedTaskTitleByKey, setInvalidEditedTaskTitleByKey] = useState<Record<string, boolean>>({});
  const [invalidEditedTaskByKey, setInvalidEditedTaskByKey] = useState<Record<string, boolean>>({});
  const [pendingTaskDraftByEntry, setPendingTaskDraftByEntry] = useState<
    Record<number, PendingTaskDraft>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSuccessMessageVisible, setIsSuccessMessageVisible] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [shouldNavigateAfterDiscard, setShouldNavigateAfterDiscard] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedSnapshotRef = useRef<string>(
    buildTimesheetSnapshot(initialNormalizedTimesheet, initialSelectedProjectCode),
  );
  const savedTimesheetRef = useRef<WeeklyTimesheetRecord>(
    cloneTimesheetRecord(initialNormalizedTimesheet),
  );
  const savedProjectCodeRef = useRef<string>(
    normalizeProjectCode(initialSelectedProjectCode),
  );
  const errorMessageRef = useRef<HTMLParagraphElement>(null);

  const isReadOnly =
    timesheet.status === "submitted" ||
    timesheet.status === "submitted_late" ||
    timesheet.status === "approved" ||
    timesheet.status === "approved_late" ||
    timesheet.status === "processed";
  const displayStatus = getConsultantTimesheetDisplayStatus(timesheet.status, timesheet.weekStart);
  const statusLabel = formatConsultantTimesheetStatusLabel(timesheet.status, timesheet.weekStart);
  const readOnlyMessage =
    timesheet.status === "processed"
      ? "This timesheet has been processed and is now read-only."
      : timesheet.status === "approved" || timesheet.status === "approved_late"
      ? "This timesheet has been approved and is now read-only."
      : timesheet.status === "submitted_late"
          ? "This timesheet was submitted late and is now read-only."
          : "This timesheet has been submitted and is now read-only.";

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

  const assignedProjectCodes = useMemo(
    () => new Set(assignedProjects.map((project) => normalizeProjectCode(project.code))),
    [assignedProjects],
  );

  const hasAssignedProjects = assignedProjects.length > 0;
  const selectedProjectIsAssigned = assignedProjectCodes.has(selectedProjectCode);

  const hasProjectCodeValidationError = selectedProjectCode.length === 0;
  const hasUnassignedProjectValidationError =
    selectedProjectCode.length > 0 && !selectedProjectIsAssigned;

  const isActionBlocked =
    hasInvalidHours ||
    hasProjectCodeValidationError ||
    hasUnassignedProjectValidationError ||
    !hasAssignedProjects;

  const mondayOptions = useMemo(
    () => buildMondayOptions(timesheet.weekStart),
    [timesheet.weekStart],
  );

  const currentSnapshot = useMemo(
    () => buildTimesheetSnapshot(timesheet, selectedProjectCode),
    [selectedProjectCode, timesheet],
  );

  const hasPendingTaskDraft = Object.keys(pendingTaskDraftByEntry).length > 0;
  const hasEditingTask = Object.values(editingTaskByKey).some(Boolean);
  const hasUnsavedTaskEditor = hasPendingTaskDraft || hasEditingTask;

  const hasUnsavedChanges = !isReadOnly && currentSnapshot !== savedSnapshotRef.current;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handlePageHide = () => {
      setIsSuccessMessageVisible(false);
      setSuccessMessage(null);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  useEffect(() => {
    if (!successMessage) {
      setIsSuccessMessageVisible(false);
      return;
    }

    setIsSuccessMessageVisible(true);

    const hideTimeoutId = window.setTimeout(() => {
      setIsSuccessMessageVisible(false);
    }, 2500);

    const clearTimeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3100);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [successMessage]);

  useEffect(() => {
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChanges || isPending) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) {
        return;
      }

      if (link.target && link.target !== "_self") {
        return;
      }

      if (link.hasAttribute("download")) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const targetUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search &&
        targetUrl.hash === currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      setPendingNavigationHref(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      setIsLeaveDialogOpen(true);
    };

    document.addEventListener("click", handleDocumentNavigation, true);
    return () => document.removeEventListener("click", handleDocumentNavigation, true);
  }, [hasUnsavedChanges, isPending]);

  function markCurrentSnapshotAsSaved(): void {
    const normalizedProjectCode = normalizeProjectCode(selectedProjectCode);
    const normalizedEntries = prepareTimesheetEntries(timesheet.entries);
    const savedTimesheet = {
      ...timesheet,
      entries: normalizedProjectCode
        ? applyProjectCodeToEntries(normalizedEntries, normalizedProjectCode)
        : normalizedEntries,
    };

    savedTimesheetRef.current = cloneTimesheetRecord(savedTimesheet);
    savedProjectCodeRef.current = normalizedProjectCode;
    savedSnapshotRef.current = buildTimesheetSnapshot(savedTimesheet, normalizedProjectCode);
  }

  function restoreSavedStateInEditor(): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    setExpandedEntryIndex(null);
    setTaskHoursDraftByKey({});
    setEditingTaskByKey({});
    setPendingTaskDraftByEntry({});
    setSelectedProjectCode(savedProjectCodeRef.current);
    setTimesheet(cloneTimesheetRecord(savedTimesheetRef.current));
  }

  const navigateAfterLeaveConfirmation = useCallback(() => {
    if (!pendingNavigationHref) {
      return;
    }

    const href = pendingNavigationHref;
    setIsLeaveDialogOpen(false);
    setPendingNavigationHref(null);
    router.push(href);
  }, [pendingNavigationHref, router]);

  function discardChangesAndNavigate(): void {
    restoreSavedStateInEditor();
    setShouldNavigateAfterDiscard(true);
  }

  useEffect(() => {
    if (!shouldNavigateAfterDiscard) {
      return;
    }

    if (currentSnapshot !== savedSnapshotRef.current) {
      return;
    }

    setShouldNavigateAfterDiscard(false);
    navigateAfterLeaveConfirmation();
  }, [currentSnapshot, shouldNavigateAfterDiscard, navigateAfterLeaveConfirmation]);

  function saveDraftThenNavigate(): void {
    if (!pendingNavigationHref) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      saveConsultantTimesheetDraftAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: prepareTimesheetEntries(timesheet.entries),
      })
        .then((result) => {
          if (!result.ok) {
            setErrorMessage(result.error);
            setIsLeaveDialogOpen(false);
            // Scroll to error message so user can see the duplicate timesheet error
            setTimeout(() => {
              errorMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
            return;
          }

          markCurrentSnapshotAsSaved();
          navigateAfterLeaveConfirmation();
        })
        .catch(() => {
          setErrorMessage("Unable to save draft right now. Please try again.");
          setIsLeaveDialogOpen(false);
        });
    });
  }

  function updateEntryTasks(
    index: number,
    taskUpdater: (tasks: WeeklyTimesheetTask[]) => WeeklyTimesheetTask[],
  ): void {
    if (isReadOnly) return;

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
    if (hasUnsavedTaskEditor) {
      return;
    }

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
    if (Number.isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
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
        hours: roundToTwoDecimals(parsedHours),
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
            : roundToTwoDecimals(Math.min(Math.max(patch.hours, 0), maxAllowedHours));

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
    const task = timesheet.entries[entryIndex]?.tasks?.[taskIndex];
    if (task) {
      const taskKey = buildTaskDraftKey(entryIndex, task.id);
      setEditingTaskByKey((prev) => {
        const next = { ...prev };
        delete next[taskKey];
        return next;
      });
      setTaskHoursDraftByKey((prev) => {
        const next = { ...prev };
        delete next[taskKey];
        return next;
      });
      setInvalidEditedTaskTitleByKey((prev) => {
        const next = { ...prev };
        delete next[taskKey];
        return next;
      });
      setInvalidEditedTaskByKey((prev) => {
        const next = { ...prev };
        delete next[taskKey];
        return next;
      });
    }

    updateEntryTasks(entryIndex, (tasks) => tasks.filter((_, currentTaskIndex) => currentTaskIndex !== taskIndex));
  }

  function saveEditedTask(taskKey: string): void {
    const separatorIndex = taskKey.indexOf(":");
    const entryIndex = Number.parseInt(taskKey.slice(0, separatorIndex), 10);
    const taskId = taskKey.slice(separatorIndex + 1);
    const task = timesheet.entries[entryIndex]?.tasks?.find((candidate) => candidate.id === taskId);

    const isTitleInvalid = !task || task.title.trim().length === 0;
    const isHoursInvalid = !task || task.hours <= 0 || task.hours > 24 || Number.isNaN(task.hours);

    if (isTitleInvalid) {
      setInvalidEditedTaskTitleByKey((prev) => ({
        ...prev,
        [taskKey]: true,
      }));
    }

    if (isHoursInvalid) {
      setInvalidEditedTaskByKey((prev) => ({
        ...prev,
        [taskKey]: true,
      }));
    }

    if (isTitleInvalid || isHoursInvalid) {
      return;
    }

    setInvalidEditedTaskTitleByKey((prev) => {
      const next = { ...prev };
      delete next[taskKey];
      return next;
    });

    setInvalidEditedTaskByKey((prev) => {
      const next = { ...prev };
      delete next[taskKey];
      return next;
    });

    setEditingTaskByKey((prev) => ({
      ...prev,
      [taskKey]: false,
    }));

    setTaskHoursDraftByKey((prev) => {
      const next = { ...prev };
      delete next[taskKey];
      return next;
    });
  }

  function clearAllTaskEditModes(): void {
    setEditingTaskByKey({});
    setTaskHoursDraftByKey({});
    setInvalidEditedTaskTitleByKey({});
    setInvalidEditedTaskByKey({});
  }

  function startEditingTask(taskKey: string, taskHours: number): void {
    clearAllTaskEditModes();

    setEditingTaskByKey((prev) => ({
      ...prev,
      [taskKey]: true,
    }));

    setTaskHoursDraftByKey((prev) => ({
      ...prev,
      [taskKey]: String(taskHours),
    }));
  }

  function loadWeek(weekStart: string): void {
    if (isReadOnly) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setExpandedEntryIndex(null);
    setEditingTaskByKey({});
    setPendingTaskDraftByEntry({});

    startTransition(() => {
      const loadAction = loadSubmittedOnWeekChange
        ? loadConsultantWeeklyTimesheetAction
        : loadConsultantWeeklyDraftTimesheetAction;

      loadAction(weekStart)
        .then((result) => {
          if (!result.ok) {
            setErrorMessage(result.error);
            return;
          }

          const nextSelectedProjectCode = resolveSelectedProjectCode(result.timesheet);
          const normalizedNextProjectCode = normalizeProjectCode(nextSelectedProjectCode);
          const resolvedNextProjectCode =
            assignedProjectCodes.has(normalizedNextProjectCode)
              ? normalizedNextProjectCode
              : "";
          const initializedTimesheet = initializeTimesheet(result.timesheet);

          savedSnapshotRef.current = buildTimesheetSnapshot(
            initializedTimesheet,
            resolvedNextProjectCode,
          );
          savedTimesheetRef.current = cloneTimesheetRecord(initializedTimesheet);
          savedProjectCodeRef.current = resolvedNextProjectCode;

          setSelectedProjectCode(resolvedNextProjectCode);
          setTimesheet(initializedTimesheet);
          router.replace(
            useNewRouteForDrafts
              ? `/consultant/new?timesheetId=${result.timesheet.id}`
              : `/consultant/timesheets/${result.timesheet.id}`,
          );
        })
        .catch(() => {
          setErrorMessage("Unable to load that week right now. Please try again.");
        });
    });
  }

  function updateWeeklyProjectCode(projectCode: string): void {
    if (isReadOnly) return;

    const normalizedProjectCode = normalizeProjectCode(projectCode);
    setSelectedProjectCode(normalizedProjectCode);
    setTimesheet((prev) => ({
      ...prev,
      entries: applyProjectCodeToEntries(prev.entries, normalizedProjectCode),
    }));
  }

  function clearForm(): void {
    if (isReadOnly) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setExpandedEntryIndex(null);
    setTaskHoursDraftByKey({});
    setEditingTaskByKey({});
    setPendingTaskDraftByEntry({});
    setSelectedProjectCode("");
    setTimesheet((prev) => buildClearedTimesheet(prev));
    setIsClearDialogOpen(false);
  }

  function saveDraft(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      saveConsultantTimesheetDraftAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: prepareTimesheetEntries(timesheet.entries),
      })
        .then((result) => {
          if (!result.ok) {
            setErrorMessage(result.error);
            return;
          }

          markCurrentSnapshotAsSaved();
          setSuccessMessage(result.message);
          router.replace(
            useNewRouteForDrafts
              ? `/consultant/new?timesheetId=${result.timesheetId ?? timesheet.id}`
              : `/consultant/timesheets/${result.timesheetId ?? timesheet.id}`,
          );
          router.refresh();
        })
        .catch(() => {
          setErrorMessage("Unable to save draft right now. Please try again.");
        });
    });
  }

  function submitTimesheet(): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitDialogOpen(false);

    startTransition(() => {
      submitConsultantTimesheetAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: prepareTimesheetEntries(timesheet.entries),
      })
        .then((result) => {
          if (!result.ok) {
            setErrorMessage(result.error);
            return;
          }

          markCurrentSnapshotAsSaved();
          setTimesheet((prev) => ({ ...prev, status: result.status ?? "submitted" }));
          setSuccessMessage(result.message);
          appendNotification(
            createTimesheetSubmittedNotification({
              projectCode: selectedProjectCode,
              weekStart: timesheet.weekStart,
              weekEnd: timesheet.weekEnd,
              isLate: result.status === "submitted_late",
            }),
          );
          router.replace(`/consultant/timesheets/${result.timesheetId ?? timesheet.id}`);
          router.refresh();
        })
        .catch(() => {
          setErrorMessage("Unable to submit timesheet right now. Please try again.");
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
          <div className="flex flex-col items-end gap-1">
            {!isReadOnly ? (
              <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    Clear form
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear this timesheet?</DialogTitle>
                    <DialogDescription>
                      This will remove all values currently entered in the form. You can still
                      save again after clearing, but the fields will be reset.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={clearForm}>
                      Yes, clear form
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={getStatusBadgeClassName(displayStatus)}
              >
                {statusLabel}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Updated {formatDateTime(timesheet.updatedAt)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isReadOnly ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              {readOnlyMessage}
            </p>
          ) : null}

          {timesheet.status === "rejected" && timesheet.managerComment ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
              <p className="font-medium">Manager rejection comment</p>
              <p className="mt-1 whitespace-pre-wrap">{timesheet.managerComment}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="weekStart">
              Week starting
            </label>
            <Select
              value={timesheet.weekStart}
              onValueChange={loadWeek}
              disabled={isReadOnly || isPending}
            >
              <SelectTrigger id="weekStart" className="w-full">
                <SelectValue placeholder="Select Monday" />
              </SelectTrigger>
              <SelectContent position="popper" align="start" side="bottom" sideOffset={8}>
                {mondayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="projectCode">
              Project
            </label>
            <Select
              value={selectedProjectCode}
              onValueChange={updateWeeklyProjectCode}
              disabled={isReadOnly || isPending || !hasAssignedProjects}
            >
              <SelectTrigger id="projectCode" className="w-full">
                <SelectValue
                  placeholder={
                    hasAssignedProjects
                      ? "Select assigned project"
                      : "No assigned projects"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assignedProjects.map((project) => (
                  <SelectItem key={project.id} value={normalizeProjectCode(project.code)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table className="w-full md:table-fixed">
            <colgroup>
              <col className="md:w-[96px]" />
              <col className="md:w-[76px]" />
              <col />
            </colgroup>
            <TableHeader className="hidden md:table-header-group">
              <TableRow>
                <TableHead className="px-2">Day</TableHead>
                <TableHead className="px-2">Hours</TableHead>
                <TableHead className="px-2">
                  <span className="block text-center pr-20">Tasks</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.entries.map((entry, index) => (
                <Fragment key={entry.date}>
                  <TableRow key={entry.date}>
                    <TableCell className="px-2 py-3 align-top whitespace-normal md:py-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                        Day
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{entry.dayLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 align-top whitespace-normal md:py-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                        Hours
                      </p>
                      <div className="font-medium tabular-nums">
                        {entry.hours.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 align-top whitespace-normal md:py-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                        Tasks
                      </p>
                      <div className="relative w-full py-1">
                        <p className="pr-0 text-left text-xs leading-5 text-muted-foreground whitespace-normal break-words md:pr-20 md:text-center md:leading-4">
                          {(entry.tasks ?? []).length === 0
                            ? "No tasks yet. Add one to break down this day."
                            : `${(entry.tasks ?? []).length} ${(entry.tasks ?? []).length === 1 ? "Task" : "Tasks"}`}
                        </p>
                        <div className="mt-2 flex justify-start md:absolute md:inset-y-0 md:right-0 md:mt-0 md:items-center md:justify-end">
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
                                disabled={isReadOnly || isPending || hasUnsavedTaskEditor}
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
                                {(() => {
                                  const taskKey = buildTaskDraftKey(index, task.id);
                                  const isEditingTask = Boolean(editingTaskByKey[taskKey]);

                                  return (
                                    <>
                                <div className="grid gap-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Task
                                  </label>
                                  <Input
                                    className={cn(
                                      invalidEditedTaskTitleByKey[taskKey] && "border-destructive",
                                    )}
                                    value={task.title}
                                    onChange={(event) =>
                                      updateTaskField(index, taskIndex, {
                                        title: event.target.value,
                                      })
                                    }
                                    onBlur={() => {
                                      const nextTitle = task.title.trim();

                                      if (nextTitle.length > 0) {
                                        setInvalidEditedTaskTitleByKey((prev) => {
                                          if (!prev[taskKey]) return prev;
                                          const next = { ...prev };
                                          delete next[taskKey];
                                          return next;
                                        });
                                      }
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" && isEditingTask) {
                                        event.preventDefault();
                                        saveEditedTask(taskKey);
                                      }
                                    }}
                                    placeholder="Describe the task"
                                    disabled={isReadOnly || isPending || !isEditingTask}
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
                                    className={cn(
                                      invalidEditedTaskByKey[taskKey] && "border-destructive",
                                    )}
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

                                      setInvalidEditedTaskByKey((prev) => {
                                        if (!prev[draftKey]) {
                                          return prev;
                                        }

                                        const next = { ...prev };
                                        delete next[draftKey];
                                        return next;
                                      });

                                      updateTaskField(index, taskIndex, {
                                        hours: Number.isNaN(nextHours) ? 0 : nextHours,
                                      });
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" && isEditingTask) {
                                        event.preventDefault();
                                        saveEditedTask(taskKey);
                                      }
                                    }}
                                    disabled={isReadOnly || isPending || !isEditingTask}
                                  />
                                </div>
                                <div className="flex items-end justify-end">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (isEditingTask) {
                                          saveEditedTask(taskKey);
                                          return;
                                        }

                                        startEditingTask(taskKey, task.hours);
                                      }}
                                      disabled={
                                        isReadOnly ||
                                        isPending ||
                                        (hasPendingTaskDraft && !isEditingTask)
                                      }
                                    >
                                      {isEditingTask ? "Save" : "Edit"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeTaskFromEntry(index, taskIndex)}
                                      disabled={isReadOnly || isPending}
                                      aria-label="Remove task"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                    </>
                                  );
                                })()}
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
                                    disabled={isReadOnly || isPending}
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
                                        isPendingTaskDraftHoursInvalid(pendingTaskDraftByEntry[index]) &&
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
                                          : String(roundToTwoDecimals(Math.min(Math.max(normalizedHours, 0), availableHours))),
                                      });
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitTaskDraft(index);
                                      }
                                    }}
                                    disabled={isReadOnly || isPending}
                                  />
                                </div>
                                <div className="flex items-end justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => commitTaskDraft(index)}
                                    disabled={isReadOnly || isPending}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => closeTaskDraft(index)}
                                    disabled={isReadOnly || isPending}
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
            <p ref={errorMessageRef} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {hasProjectCodeValidationError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Select a project for this weekly timesheet.
            </p>
          ) : null}

          {!hasAssignedProjects ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              You are not assigned to any active projects. Contact your administrator.
            </p>
          ) : null}

          {hasUnassignedProjectValidationError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              The selected project is not assigned to your account.
            </p>
          ) : null}

          {successMessage ? (
            <div
              className={cn(
                "overflow-hidden transition-all duration-500 ease-out",
                isSuccessMessageVisible
                  ? "max-h-20 opacity-100 translate-y-0"
                  : "max-h-0 opacity-0 -translate-y-1",
              )}
            >
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                {successMessage}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={
                isPending ||
                isReadOnly ||
                isActionBlocked
              }
            >
              Save Draft
            </Button>
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  disabled={
                    isPending ||
                    isReadOnly ||
                    isActionBlocked ||
                    totalHours <= 0
                  }
                >
                  Submit Timesheet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit this timesheet?</DialogTitle>
                  <DialogDescription>
                    Once submitted, this timesheet will be locked for edits and routed for review.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsSubmitDialogOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button onClick={submitTimesheet} disabled={isPending}>
                    {isPending ? "Submitting..." : "Yes, submit timesheet"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save draft before leaving?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Save this draft before leaving, or continue without saving and lose your updates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLeaveDialogOpen(false);
                setPendingNavigationHref(null);
              }}
              disabled={isPending}
            >
              Stay on page
            </Button>
            <Button
              variant="destructive"
              onClick={discardChangesAndNavigate}
              disabled={isPending}
            >
              Leave without saving
            </Button>
            <Button onClick={saveDraftThenNavigate} disabled={isPending}>
              {isPending ? "Saving..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
