import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type TimesheetStatus = "draft" | "submitted";

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

function buildTimesheetId(): string {
  return `ts-${randomUUID()}`;
}

function buildDatabaseTimesheetId(): string {
  return randomUUID();
}

function normalizeTimesheetStatus(value: string | null | undefined): TimesheetStatus {
  return value === "submitted" ? "submitted" : "draft";
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

function toTimesheetSummaryFromDb(row: SupabaseTimesheetRow): TimesheetSummaryRecord {
  return {
    id: row.id,
    weekStart: row.week_start_date,
    weekEnd: row.week_end_date,
    status: normalizeTimesheetStatus(row.status),
    totalHours: toNumber(row.total_hours),
    updatedAt: row.updated_at ?? row.submitted_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function toWeeklyRecordFromDb(
  row: SupabaseTimesheetRow,
  entries: SupabaseTimeEntryRow[],
  projectCodeById: Map<string, string>,
): WeeklyTimesheetRecord {
  return {
    id: row.id,
    weekStart: row.week_start_date,
    weekEnd: row.week_end_date,
    status: normalizeTimesheetStatus(row.status),
    entries: entries
      .sort((left, right) => left.entry_date.localeCompare(right.entry_date))
      .map((entry) => ({
        date: entry.entry_date,
        dayLabel: new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        projectCode: projectCodeById.get(entry.project_id) ?? "",
        hours: toNumber(entry.hours),
        notes: entry.notes ?? "",
        tasks: [],
      })),
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

async function listSubmittedTimesheetSummariesForConsultant(
  consultantId: string,
): Promise<TimesheetSummaryRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(
      "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_at, export_completed, created_at, updated_at",
    )
    .eq("consultant_id", consultantId)
    .eq("status", "submitted")
    .order("week_start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toTimesheetSummaryFromDb(row as SupabaseTimesheetRow));
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

async function findSubmittedTimesheetByWeekStart(
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
    .eq("status", "submitted")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseTimesheetRow | null) ?? null;
}

async function findSubmittedTimesheetById(
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
      ...entry,
      projectCode: normalizeProjectCode(entry.projectCode),
      notes: entry.notes ?? "",
      tasks: [],
    }));
}

function resolveWeekStart(inputWeekStart?: string): Date {
  if (inputWeekStart) {
    return parseIsoDate(inputWeekStart);
  }

  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
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
  id: string = buildTimesheetId(),
): WeeklyTimesheetRecord {
  const startDate = resolveWeekStart(weekStart);
  const normalizedWeekStart = toIsoDate(startDate);
  return {
    id,
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

    return listSubmittedTimesheetSummariesForConsultant(consultantId);
  },

  async createNewWeeklyTimesheet(): Promise<WeeklyTimesheetRecord> {
    return buildDraftTimesheet();
  },

  async getWeeklyTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const consultantId = await getAuthenticatedConsultantId();
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    if (consultantId) {
      const submittedRecord = await findSubmittedTimesheetByWeekStart(
        consultantId,
        normalizedWeekStart,
      );

      if (submittedRecord) {
        const entries = await fetchSubmittedTimesheetEntries(submittedRecord.id);
        const projectIds = Array.from(new Set(entries.map((entry) => entry.project_id)));
        const projectCodeById = await fetchProjectCodesByIds(projectIds);

        return toWeeklyRecordFromDb(submittedRecord, entries, projectCodeById);
      }
    }

    return buildDraftTimesheet(normalizedWeekStart);
  },

  async getWeeklyTimesheetById(timesheetId: string): Promise<WeeklyTimesheetRecord> {
    // Draft IDs start with "ts-"; skip database lookup for drafts
    const isDraftId = timesheetId.startsWith("ts-");

    if (!isDraftId) {
      const consultantId = await getAuthenticatedConsultantId();

      if (consultantId) {
        const submittedRecord = await findSubmittedTimesheetById(consultantId, timesheetId);
        if (submittedRecord) {
          const entries = await fetchSubmittedTimesheetEntries(submittedRecord.id);
          const projectIds = Array.from(new Set(entries.map((entry) => entry.project_id)));
          const projectCodeById = await fetchProjectCodesByIds(projectIds);

          return toWeeklyRecordFromDb(submittedRecord, entries, projectCodeById);
        }
      }
    }

    return buildDraftTimesheet(undefined, timesheetId);
  },

  async saveWeeklyTimesheetDraft(input: SaveTimesheetInput): Promise<{ savedAt: string }> {
    validateTimesheetEntries(input.entries);
    const consultantId = await getAuthenticatedConsultantId();
    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    if (consultantId) {
      const submittedRecord = await findSubmittedTimesheetByWeekStart(
        consultantId,
        normalizedWeekStart,
      );

      if (submittedRecord) {
        throw new Error("This timesheet has already been submitted.");
      }
    }

    const savedAt = new Date().toISOString();

    return { savedAt };
  },

  async submitWeeklyTimesheet(input: SaveTimesheetInput): Promise<{ submittedAt: string; timesheetId: string }> {
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

    const submittedRecord = await findSubmittedTimesheetByWeekStart(
      consultantId,
      normalizedWeekStart,
    );

    if (submittedRecord) {
      throw new Error("This timesheet has already been submitted.");
    }

    const submittedAt = new Date().toISOString();
    const timesheetId = buildDatabaseTimesheetId();
    const preparedEntries = normalizeSubmittedEntries(input.entries);

    const timesheetPayload = {
      id: timesheetId,
      consultant_id: consultantId,
      being_processed_by: null,
      week_start_date: normalizedWeekStart,
      week_end_date: toIsoDate(addDays(startDate, 6)),
      status: "submitted" as const,
      total_hours: sumEntriesHours(preparedEntries),
      submitted_at: submittedAt,
      approved_at: null,
      processed_at: null,
      being_processed_at: null,
      export_completed: false,
      created_at: submittedAt,
      updated_at: submittedAt,
    };

    const supabase = await createClient();
    const { error: timesheetInsertError } = await supabase
      .from("timesheets")
      .insert(timesheetPayload);

    if (timesheetInsertError) {
      throw new Error(timesheetInsertError.message);
    }

    const { error: entriesInsertError } = await supabase.from("time_entries").insert(
      preparedEntries.map((entry) => ({
        timesheet_id: timesheetId,
        project_id: selectedProject.id,
        entry_date: entry.date,
        hours: entry.hours,
        notes: entry.notes.trim(),
      })),
    );

    if (entriesInsertError) {
      await supabase.from("timesheets").delete().eq("id", timesheetId);
      throw new Error(entriesInsertError.message);
    }

    return { submittedAt, timesheetId };
  },

  async deleteDraftTimesheet(timesheetId: string): Promise<void> {
    return;
  },
};
