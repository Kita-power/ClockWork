import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type TimesheetStatus = "draft" | "submitted" | "submitted_late";

export type WeeklyTimesheetTask = {
  id: string;
  title: string;
  hours: number;
};

export type WeeklyTimesheetEntry = {
  date: string;
  dayLabel: string;
  projectCode: string;
  hours: number;
  notes: string;
  tasks?: WeeklyTimesheetTask[];
};

export type WeeklyTimesheetRecord = {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: TimesheetStatus;
  entries: WeeklyTimesheetEntry[];
};

export type TimesheetSummaryRecord = {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: TimesheetStatus;
  projectCode: string;
  totalHours: number;
  updatedAt: string;
};

export type SaveTimesheetInput = {
  id?: string;
  weekStart: string;
  entries: WeeklyTimesheetEntry[];
};

export type ConsultantAssignedProject = {
  id: string;
  code: string;
  name: string;
};

type SupabaseTimesheetRow = {
  id: string;
  consultant_id: string;
  project_id: string | null;
  being_processed_by: string | null;
  week_start_date: string;
  week_end_date: string;
  status: TimesheetStatus;
  total_hours: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  processed_at: string | null;
  being_processed_at: string | null;
  export_completed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseTimeEntryRow = {
  id?: string;
  timesheet_id: string;
  project_id: string;
  entry_date: string;
  hours: number | string | null;
  notes: string | null;
};

type SupabaseProjectRow = {
  id: string;
  code: string;
  name: string;
};

type SerializedTimeEntryNotes = {
  text: string;
  tasks: WeeklyTimesheetTask[];
};

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(input: string): Date {
  const [year, month, day] = input.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function buildTimesheetId(weekStart?: string): string {
  if (weekStart) {
    return `ts_${weekStart}_${randomUUID()}`;
  }
  return `ts_${randomUUID()}`;
}

function getDatabaseTimesheetId(timesheetId?: string): string | undefined {
  if (!timesheetId) {
    return undefined;
  }

  if (!timesheetId.startsWith("ts_")) {
    return timesheetId;
  }

  const match = timesheetId.match(/^ts_[\d-]+_(.+)$/);
  return match?.[1] ?? undefined;
}

function buildDatabaseTimesheetId(): string {
  return randomUUID();
}

function normalizeTimesheetStatus(value: string | null | undefined): TimesheetStatus {
  if (value === "submitted") {
    return "submitted";
  }

  if (value === "submitted_late") {
    return "submitted_late";
  }

  return "draft";
}

function resolveSubmissionStatus(weekStart: string, submittedAt: Date): TimesheetStatus {
  const weekStartDate = parseIsoDate(weekStart);
  const submissionDeadline = addDays(weekStartDate, 7);
  submissionDeadline.setHours(0, 0, 0, 0);

  return submittedAt.getTime() > submissionDeadline.getTime() ? "submitted_late" : "submitted";
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumEntriesHours(entries: WeeklyTimesheetEntry[]): number {
  return entries.reduce((sum, entry) => sum + (Number.isFinite(entry.hours) ? entry.hours : 0), 0);
}

function sumTaskHours(tasks: WeeklyTimesheetTask[]): number {
  return tasks.reduce((sum, task) => sum + (Number.isFinite(task.hours) ? task.hours : 0), 0);
}

function normalizeTaskForPersistence(
  task: WeeklyTimesheetTask,
  taskIndex: number,
  entryDate: string,
): WeeklyTimesheetTask {
  return {
    id: task.id.trim().length > 0 ? task.id : `${entryDate}-${taskIndex + 1}`,
    title: task.title.trim(),
    hours: Number.isFinite(task.hours) ? task.hours : 0,
  };
}

function normalizeEntryForPersistence(entry: WeeklyTimesheetEntry): WeeklyTimesheetEntry {
  const tasks = (entry.tasks ?? []).map((task, taskIndex) =>
    normalizeTaskForPersistence(task, taskIndex, entry.date),
  );

  return {
    ...entry,
    projectCode: normalizeProjectCode(entry.projectCode),
    notes: entry.notes ?? "",
    tasks,
    hours: tasks.length > 0 ? sumTaskHours(tasks) : Number.isFinite(entry.hours) ? entry.hours : 0,
  };
}

function serializeTimeEntryNotes(entry: WeeklyTimesheetEntry): string | null {
  const text = entry.notes.trim();
  const tasks = entry.tasks ?? [];

  if (text.length === 0 && tasks.length === 0) {
    return null;
  }

  return JSON.stringify({
    text,
    tasks,
  } satisfies SerializedTimeEntryNotes);
}

function parseTimeEntryNotes(notes: string | null | undefined): SerializedTimeEntryNotes {
  if (!notes) {
    return { text: "", tasks: [] };
  }

  try {
    const parsed = JSON.parse(notes) as Partial<SerializedTimeEntryNotes>;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.tasks)) {
      return {
        text: typeof parsed.text === "string" ? parsed.text : "",
        tasks: parsed.tasks.map((task, taskIndex) =>
          normalizeTaskForPersistence(task, taskIndex, "notes"),
        ),
      };
    }
  } catch {
    // Fall through to legacy plain-text notes.
  }

  return { text: notes, tasks: [] };
}

function toTimesheetSummaryFromDb(row: SupabaseTimesheetRow): TimesheetSummaryRecord {
  return {
    id: row.id,
    weekStart: row.week_start_date,
    weekEnd: row.week_end_date,
    status: normalizeTimesheetStatus(row.status),
    projectCode: "",
    totalHours: toNumber(row.total_hours),
    updatedAt: row.updated_at ?? row.submitted_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function toWeeklyRecordFromDb(
  row: SupabaseTimesheetRow,
  entries: SupabaseTimeEntryRow[],
  projectCodeById: Map<string, string>,
): WeeklyTimesheetRecord {
  const weekEntries = buildWeekEntries(row.week_start_date);

  for (const entry of entries) {
    const index = weekEntries.findIndex((weekEntry) => weekEntry.date === entry.entry_date);
    if (index === -1) {
      continue;
    }

    const parsedNotes = parseTimeEntryNotes(entry.notes);

    weekEntries[index] = {
      ...weekEntries[index],
      projectCode: projectCodeById.get(entry.project_id) ?? weekEntries[index].projectCode,
      hours: toNumber(entry.hours),
      notes: parsedNotes.text,
      tasks: parsedNotes.tasks,
    };
  }

  return {
    id: row.id,
    weekStart: row.week_start_date,
    weekEnd: row.week_end_date,
    status: normalizeTimesheetStatus(row.status),
    entries: weekEntries,
  };
}

async function getAuthenticatedConsultantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user?.id ?? null;
}

async function listTimesheetSummariesForConsultant(
  consultantId: string,
): Promise<TimesheetSummaryRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, project_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .order("week_start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SupabaseTimesheetRow[];
  const projectIds = Array.from(
    new Set(rows.map((row) => row.project_id).filter((value): value is string => Boolean(value))),
  );

  const projectCodeById = projectIds.length > 0 ? await fetchProjectCodesByIds(projectIds) : new Map<string, string>();

  return rows.map((row) => ({
    ...toTimesheetSummaryFromDb(row),
    projectCode: row.project_id ? projectCodeById.get(row.project_id) ?? "" : "",
  }));
}

async function listAssignedProjectsForConsultantId(
  consultantId: string,
): Promise<ConsultantAssignedProject[]> {
  const supabase = await createClient();

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("consultant_id", consultantId);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const assignedProjectIds = Array.from(
    new Set(
      (assignmentRows ?? [])
        .map((row) => row.project_id)
        .filter((value): value is string =>
          typeof value === "string" && value.trim().length > 0,
        ),
    ),
  );

  if (assignedProjectIds.length === 0) {
    return [];
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, code, name")
    .in("id", assignedProjectIds)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  return (projects ?? []).map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
  }));
}

async function findSubmittedTimesheetByWeekAndProject(
  consultantId: string,
  weekStart: string,
  projectId: string,
): Promise<SupabaseTimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("week_start_date", weekStart)
    .eq("project_id", projectId)
    .in("status", ["submitted", "submitted_late"])
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function findDraftTimesheetByWeekStart(
  consultantId: string,
  weekStart: string,
): Promise<SupabaseTimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("week_start_date", weekStart)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function findDraftTimesheetById(
  consultantId: string,
  timesheetId: string,
): Promise<SupabaseTimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("id", timesheetId)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function findDraftTimesheetByWeekAndProject(
  consultantId: string,
  weekStart: string,
  projectId: string,
): Promise<SupabaseTimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("week_start_date", weekStart)
    .eq("project_id", projectId)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function findTimesheetById(
  consultantId: string,
  timesheetId: string,
): Promise<SupabaseTimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("id", timesheetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function fetchSubmittedTimesheetEntries(
  timesheetId: string,
): Promise<SupabaseTimeEntryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, timesheet_id, project_id, entry_date, hours, notes")
    .eq("timesheet_id", timesheetId)
    .order("entry_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupabaseTimeEntryRow[];
}

async function fetchProjectCodesByIds(
  projectIds: string[],
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, code, name")
    .in("id", projectIds);

  if (error) {
    throw new Error(error.message);
  }

  const projects = (data ?? []) as SupabaseProjectRow[];
  return new Map(projects.map((project) => [project.id, project.code]));
}

function normalizeSubmittedEntries(
  entries: WeeklyTimesheetEntry[],
): WeeklyTimesheetEntry[] {
  return entries
    .filter((entry) => Number.isFinite(entry.hours) && entry.hours > 0)
    .map((entry) => ({
      ...normalizeEntryForPersistence(entry),
      projectCode: normalizeProjectCode(entry.projectCode),
    }));
}

function resolveWeekStart(inputWeekStart?: string): Date {
  let baseDate: Date;

  if (inputWeekStart) {
    baseDate = parseIsoDate(inputWeekStart);
  } else {
    baseDate = new Date();
  }

  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildEntry(date: Date): WeeklyTimesheetEntry {
  const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
  return {
    date: toIsoDate(date),
    dayLabel,
    projectCode: "",
    hours: 0,
    notes: "",
    tasks: [],
  };
}

function buildWeekEntries(
  weekStart: string,
  projectCode = "",
): WeeklyTimesheetEntry[] {
  const normalizedProjectCode = normalizeProjectCode(projectCode);
  const startDate = resolveWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const current = addDays(startDate, index);
    return {
      ...buildEntry(current),
      projectCode: normalizedProjectCode,
    };
  });
}

function buildDraftTimesheet(
  weekStart?: string,
  id?: string,
): WeeklyTimesheetRecord {
  const startDate = resolveWeekStart(weekStart);
  const normalizedWeekStart = toIsoDate(startDate);
  const timesheetId = id ?? buildTimesheetId(normalizedWeekStart);
  return {
    id: timesheetId,
    weekStart: normalizedWeekStart,
    weekEnd: toIsoDate(addDays(startDate, 6)),
    status: "draft",
    entries: buildWeekEntries(normalizedWeekStart),
  };
}

function validateTimesheetEntries(entries: WeeklyTimesheetEntry[]): void {
  const normalizedProjectCodes = entries
    .map((entry) => normalizeProjectCode(entry.projectCode))
    .filter((value) => value.length > 0);

  const uniqueProjectCodes = Array.from(new Set(normalizedProjectCodes));

  if (uniqueProjectCodes.length === 0) {
    throw new Error("Select a project code before saving this timesheet.");
  }

  if (uniqueProjectCodes.length > 1) {
    throw new Error("Only one project code is allowed per weekly timesheet.");
  }

  const hasBlankProjectRow = entries.some(
    (entry) => normalizeProjectCode(entry.projectCode).length === 0,
  );

  if (hasBlankProjectRow) {
    throw new Error("Every day must use the selected weekly project code.");
  }

  const hasTaskHoursOverflow = entries.some((entry) => {
    const taskHours = (entry.tasks ?? []).reduce((sum, task) => {
      return sum + (Number.isFinite(task.hours) ? task.hours : 0);
    }, 0);

    return taskHours > 24;
  });

  if (hasTaskHoursOverflow) {
    throw new Error("Task hours for a day cannot exceed 24.");
  }

  const invalidRow = entries.find((entry) => {
    const hasInvalidHours = entry.hours < 0 || entry.hours > 24;

    return hasInvalidHours;
  });

  if (!invalidRow) return;

  if (invalidRow.hours < 0 || invalidRow.hours > 24) {
    throw new Error("Hours must be between 0 and 24.");
  }
}

export const consultantService = {
  description:
    "Handles consultant workflows such as draft, submit, and resubmit timesheets.",

  async listAssignedProjectsForCurrentConsultant(): Promise<ConsultantAssignedProject[]> {
    const consultantId = await getAuthenticatedConsultantId();
    if (!consultantId) {
      return [];
    }
    return listAssignedProjectsForConsultantId(consultantId);
  },

  async listTimesheets(): Promise<TimesheetSummaryRecord[]> {
    const consultantId = await getAuthenticatedConsultantId();

    if (!consultantId) {
      return [];
    }

    return listTimesheetSummariesForConsultant(consultantId);
  },

  async createNewWeeklyTimesheet(): Promise<WeeklyTimesheetRecord> {
    return buildDraftTimesheet();
  },

  async getWeeklyDraftTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    return buildDraftTimesheet(normalizedWeekStart);
  },

  async getWeeklyTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    return buildDraftTimesheet(normalizedWeekStart);
  },

  async getWeeklyTimesheetById(timesheetId: string): Promise<WeeklyTimesheetRecord> {
    // Draft IDs start with "ts_"; skip database lookup for drafts
    const isDraftId = timesheetId.startsWith("ts_");

    if (isDraftId) {
      // Extract week start from draft ID format: ts_YYYY-MM-DD_UUID
      const match = timesheetId.match(/^ts_([\d-]+)_/);
      const weekStart = match ? match[1] : undefined;
      return buildDraftTimesheet(weekStart, timesheetId);
    }

    const consultantId = await getAuthenticatedConsultantId();

    if (!consultantId) {
      throw new Error("Timesheet not found");
    }

    const record = await findTimesheetById(consultantId, timesheetId);
    if (record) {
      const entries = await fetchSubmittedTimesheetEntries(record.id);
      const projectIds = Array.from(new Set(entries.map((entry) => entry.project_id)));
      const projectCodeById = await fetchProjectCodesByIds(projectIds);

      return toWeeklyRecordFromDb(record, entries, projectCodeById);
    }

    throw new Error("Timesheet not found");
  },

  async saveWeeklyTimesheetDraft(input: SaveTimesheetInput): Promise<{ savedAt: string; timesheetId: string }> {
    validateTimesheetEntries(input.entries);
    const consultantId = await getAuthenticatedConsultantId();
    if (!consultantId) {
      throw new Error("No authenticated user");
    }

    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    const assignedProjects = await listAssignedProjectsForConsultantId(consultantId);
    const selectedProjectCode = normalizeProjectCode(
      input.entries.find((entry) => normalizeProjectCode(entry.projectCode).length > 0)?.projectCode ?? "",
    );
    const selectedProject = assignedProjects.find(
      (project) => normalizeProjectCode(project.code) === selectedProjectCode,
    );

    if (!selectedProject) {
      throw new Error("The selected project is not assigned to your account.");
    }

    const existingSubmittedRecord = await findSubmittedTimesheetByWeekAndProject(
      consultantId,
      normalizedWeekStart,
      selectedProject.id,
    );

    if (existingSubmittedRecord) {
      throw new Error("A timesheet for this week with the same project code has already been submitted.");
    }

    const providedTimesheetId = getDatabaseTimesheetId(input.id);
    const existingDraft = providedTimesheetId
      ? await findDraftTimesheetById(consultantId, providedTimesheetId)
      : null;

    if (!existingDraft && providedTimesheetId) {
      const otherDraftRecord = await findDraftTimesheetByWeekAndProject(
        consultantId,
        normalizedWeekStart,
        selectedProject.id,
      );

      if (otherDraftRecord) {
        throw new Error("A draft timesheet of the same week and the same project code already exists.");
      }
    }

    const timesheetId = existingDraft?.id ?? providedTimesheetId ?? buildDatabaseTimesheetId();

    const savedAt = new Date().toISOString();
    const draftPayload = {
      id: timesheetId,
      consultant_id: consultantId,
      project_id: selectedProject.id,
      being_processed_by: null,
      week_start_date: normalizedWeekStart,
      week_end_date: toIsoDate(addDays(startDate, 6)),
      status: "draft" as const,
      total_hours: sumEntriesHours(input.entries),
      submitted_at: null,
      approved_at: null,
      processed_at: null,
      being_processed_at: null,
      export_completed: false,
      updated_at: savedAt,
    };

    const supabase = await createClient();

    if (existingDraft) {
      const { error: draftUpdateError } = await supabase
        .from("timesheets")
        .update(draftPayload)
        .eq("id", timesheetId)
        .eq("consultant_id", consultantId)
        .eq("status", "draft");

      if (draftUpdateError) {
        throw new Error(draftUpdateError.message);
      }
    } else {
      const { error: draftInsertError } = await supabase.from("timesheets").insert({
        ...draftPayload,
        created_at: savedAt,
      });

      if (draftInsertError) {
        throw new Error(draftInsertError.message);
      }
    }

    const { error: deleteEntriesError } = await supabase
      .from("time_entries")
      .delete()
      .eq("timesheet_id", timesheetId);

    if (deleteEntriesError) {
      throw new Error(deleteEntriesError.message);
    }

    const draftEntriesToPersist = input.entries.filter(
      (entry) => Number.isFinite(entry.hours) && entry.hours > 0,
    );

    if (draftEntriesToPersist.length > 0) {
      const { error: draftEntriesInsertError } = await supabase.from("time_entries").insert(
        draftEntriesToPersist.map((entry) => {
          const normalizedEntry = normalizeEntryForPersistence(entry);

          return {
            timesheet_id: timesheetId,
            project_id: selectedProject.id,
            entry_date: normalizedEntry.date,
            hours: normalizedEntry.hours,
            notes: serializeTimeEntryNotes(normalizedEntry),
          };
        }),
      );

      if (draftEntriesInsertError) {
        throw new Error(draftEntriesInsertError.message);
      }
    }

    return { savedAt, timesheetId };
  },

  async submitWeeklyTimesheet(
    input: SaveTimesheetInput,
  ): Promise<{ submittedAt: string; timesheetId: string; status: TimesheetStatus }> {
    validateTimesheetEntries(input.entries);
    const consultantId = await getAuthenticatedConsultantId();
    if (!consultantId) {
      throw new Error("No authenticated user");
    }

    const assignedProjects = await listAssignedProjectsForConsultantId(consultantId);
    const selectedProjectCode = normalizeProjectCode(
      input.entries.find((entry) => normalizeProjectCode(entry.projectCode).length > 0)?.projectCode ?? "",
    );
    const selectedProject = assignedProjects.find(
      (project) => normalizeProjectCode(project.code) === selectedProjectCode,
    );

    if (!selectedProject) {
      throw new Error("The selected project is not assigned to your account.");
    }

    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    const existingSubmittedRecord = await findSubmittedTimesheetByWeekAndProject(
      consultantId,
      normalizedWeekStart,
      selectedProject.id,
    );

    if (existingSubmittedRecord) {
      throw new Error("A timesheet for this week with the same project code has already been submitted.");
    }

    const submittedAtDate = new Date();
    const submittedAt = submittedAtDate.toISOString();
    const submissionStatus = resolveSubmissionStatus(normalizedWeekStart, submittedAtDate);
    const providedTimesheetId = getDatabaseTimesheetId(input.id);
    const existingDraft = providedTimesheetId
      ? await findDraftTimesheetById(consultantId, providedTimesheetId)
      : null;
    const timesheetId = existingDraft?.id ?? providedTimesheetId ?? buildDatabaseTimesheetId();
    const preparedEntries = normalizeSubmittedEntries(input.entries);

    const timesheetPayload = {
      id: timesheetId,
      consultant_id: consultantId,
      project_id: selectedProject.id,
      being_processed_by: null,
      week_start_date: normalizedWeekStart,
      week_end_date: toIsoDate(addDays(startDate, 6)),
      status: submissionStatus,
      total_hours: sumEntriesHours(preparedEntries),
      submitted_at: submittedAt,
      approved_at: null,
      processed_at: null,
      being_processed_at: null,
      export_completed: false,
      updated_at: submittedAt,
    };

    const supabase = await createClient();

    if (existingDraft) {
      const { error: timesheetUpdateError } = await supabase
        .from("timesheets")
        .update(timesheetPayload)
        .eq("id", timesheetId)
        .eq("consultant_id", consultantId)
        .eq("status", "draft");

      if (timesheetUpdateError) {
        throw new Error(timesheetUpdateError.message);
      }

      const { error: deleteDraftEntriesError } = await supabase
        .from("time_entries")
        .delete()
        .eq("timesheet_id", timesheetId);

      if (deleteDraftEntriesError) {
        throw new Error(deleteDraftEntriesError.message);
      }
    } else {
      const { error: timesheetInsertError } = await supabase
        .from("timesheets")
        .insert({
          ...timesheetPayload,
          created_at: submittedAt,
        });

      if (timesheetInsertError) {
        throw new Error(timesheetInsertError.message);
      }
    }

    const { error: entriesInsertError } = await supabase.from("time_entries").insert(
      preparedEntries.map((entry) => {
        const normalizedEntry = normalizeEntryForPersistence(entry);

        return {
          timesheet_id: timesheetId,
          project_id: selectedProject.id,
          entry_date: normalizedEntry.date,
          hours: normalizedEntry.hours,
          notes: serializeTimeEntryNotes(normalizedEntry),
        };
      }),
    );

    if (entriesInsertError) {
      if (existingDraft) {
        await supabase
          .from("timesheets")
          .update({ status: "draft", submitted_at: null, updated_at: submittedAt })
          .eq("id", timesheetId)
          .eq("consultant_id", consultantId);
      } else {
        await supabase.from("timesheets").delete().eq("id", timesheetId);
      }
      throw new Error(entriesInsertError.message);
    }

    return { submittedAt, timesheetId, status: submissionStatus };
  },

  async deleteDraftTimesheet(timesheetId: string): Promise<void> {
    if (timesheetId.startsWith("ts_")) {
      return;
    }

    const consultantId = await getAuthenticatedConsultantId();
    if (!consultantId) {
      throw new Error("No authenticated user");
    }

    const supabase = await createClient();

    const { error: deleteEntriesError } = await supabase
      .from("time_entries")
      .delete()
      .eq("timesheet_id", timesheetId);

    if (deleteEntriesError) {
      throw new Error(deleteEntriesError.message);
    }

    const { error: deleteDraftError } = await supabase
      .from("timesheets")
      .delete()
      .eq("id", timesheetId)
      .eq("consultant_id", consultantId)
      .eq("status", "draft");

    if (deleteDraftError) {
      throw new Error(deleteDraftError.message);
    }
  },
};
