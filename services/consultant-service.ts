import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
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

type StoredWeeklyTimesheetRecord = WeeklyTimesheetRecord & {
  id: string;
  updatedAt: string;
};

const MOCK_DATA_DIRECTORY = join(process.cwd(), ".mock-data");
const MOCK_TIMESHEET_STORE_PATH = join(
  MOCK_DATA_DIRECTORY,
  "consultant-timesheets.json",
);

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

function toTimesheetSummaryFromRecord(record: StoredWeeklyTimesheetRecord): TimesheetSummaryRecord {
  return {
    id: record.id,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    status: record.status,
    totalHours: toNumber(sumEntriesHours(record.entries)),
    updatedAt: record.updatedAt,
  };
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

async function deleteLocalDraftTimesheet(timesheetId: string): Promise<void> {
  const records = await readTimesheetStore();
  const nextRecords = records.filter((record) => record.id !== timesheetId);

  if (nextRecords.length !== records.length) {
    await writeTimesheetStore(nextRecords);
  }
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

function cloneEntries(entries: WeeklyTimesheetEntry[]): WeeklyTimesheetEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

function buildStoredTimesheet(
  weekStart: string,
  input?: {
    id?: string;
    status?: TimesheetStatus;
    entries?: WeeklyTimesheetEntry[];
    projectCode?: string;
    updatedAt?: string;
  },
): StoredWeeklyTimesheetRecord {
  const startDate = resolveWeekStart(weekStart);
  const normalizedWeekStart = toIsoDate(startDate);
  const endDate = addDays(startDate, 6);

  return {
    id: input?.id ?? buildTimesheetId(),
    weekStart: normalizedWeekStart,
    weekEnd: toIsoDate(endDate),
    status: input?.status ?? "draft",
    entries: cloneEntries(
      input?.entries ??
        buildWeekEntries(normalizedWeekStart, input?.projectCode),
    ),
    updatedAt: input?.updatedAt ?? new Date().toISOString(),
  };
}

function toSummary(record: StoredWeeklyTimesheetRecord): TimesheetSummaryRecord {
  const totalHours = record.entries.reduce((sum, entry) => {
    const value = Number.isFinite(entry.hours) ? entry.hours : 0;
    return sum + value;
  }, 0);

  return {
    id: record.id,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    status: record.status,
    totalHours,
    updatedAt: record.updatedAt,
  };
}

function toWeeklyRecord(record: StoredWeeklyTimesheetRecord): WeeklyTimesheetRecord {
  return {
    id: record.id,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    status: record.status,
    entries: cloneEntries(record.entries),
  };
}

function normalizeStoredRecords(
  records: StoredWeeklyTimesheetRecord[],
): StoredWeeklyTimesheetRecord[] {
  const seenIds = new Set<string>();

  return records.map((record) => {
    const normalizedId =
      typeof record.id === "string" &&
      record.id.trim().length > 0 &&
      !seenIds.has(record.id)
        ? record.id
        : buildTimesheetId();

    seenIds.add(normalizedId);

    return {
      ...record,
      id: normalizedId,
    };
  });
}

function seedTimesheetStore(): StoredWeeklyTimesheetRecord[] {
  const currentWeekStart = resolveWeekStart();
  const previousWeekStart = addDays(currentWeekStart, -7);
  const twoWeeksAgoStart = addDays(currentWeekStart, -14);

  const currentWeek = buildStoredTimesheet(toIsoDate(currentWeekStart), {
    status: "draft",
    entries: buildWeekEntries(toIsoDate(currentWeekStart)).map((entry, index) => {
      if (index === 0) return { ...entry, projectCode: "PROJ-001", hours: 8, notes: "Planning" };
      if (index === 1) return { ...entry, projectCode: "PROJ-001", hours: 7.5, notes: "Delivery" };
      if (index === 2) return { ...entry, projectCode: "PROJ-002", hours: 8, notes: "Client workshop" };
      if (index === 3) return { ...entry, projectCode: "PROJ-001", hours: 8, notes: "Implementation" };
      return entry;
    }),
  });

  const previousWeek = buildStoredTimesheet(toIsoDate(previousWeekStart), {
    status: "submitted",
    entries: buildWeekEntries(toIsoDate(previousWeekStart)).map((entry, index) => {
      if (index <= 4) return { ...entry, projectCode: "PROJ-003", hours: 8, notes: "Project execution" };
      return entry;
    }),
    updatedAt: addDays(new Date(), -4).toISOString(),
  });

  const twoWeeksAgo = buildStoredTimesheet(toIsoDate(twoWeeksAgoStart), {
    status: "submitted",
    entries: buildWeekEntries(toIsoDate(twoWeeksAgoStart)).map((entry, index) => {
      if (index === 0) return { ...entry, projectCode: "PROJ-004", hours: 8, notes: "Discovery" };
      if (index === 1) return { ...entry, projectCode: "PROJ-004", hours: 7.75, notes: "Scoping" };
      if (index === 2) return { ...entry, projectCode: "PROJ-004", hours: 8, notes: "Workshop" };
      if (index === 3) return { ...entry, projectCode: "PROJ-004", hours: 7, notes: "Implementation" };
      if (index === 4) return { ...entry, projectCode: "PROJ-004", hours: 8, notes: "QA" };
      return entry;
    }),
    updatedAt: addDays(new Date(), -11).toISOString(),
  });

  return [currentWeek, previousWeek, twoWeeksAgo];
}

async function ensureMockTimesheetStoreFile(): Promise<void> {
  try {
    await fs.access(MOCK_TIMESHEET_STORE_PATH);
  } catch {
    await fs.mkdir(MOCK_DATA_DIRECTORY, { recursive: true });
    await fs.writeFile(
      MOCK_TIMESHEET_STORE_PATH,
      JSON.stringify(seedTimesheetStore(), null, 2),
      "utf8",
    );
  }
}

async function readTimesheetStore(): Promise<StoredWeeklyTimesheetRecord[]> {
  await ensureMockTimesheetStoreFile();
  const content = await fs.readFile(MOCK_TIMESHEET_STORE_PATH, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return seedTimesheetStore();
    }

    const normalized = normalizeStoredRecords(parsed as StoredWeeklyTimesheetRecord[]);
    const shouldRewriteStore = normalized.some((record, index) => record.id !== parsed[index]?.id);

    if (shouldRewriteStore) {
      await writeTimesheetStore(normalized);
    }

    return normalized;
  } catch {
    return seedTimesheetStore();
  }
}

async function writeTimesheetStore(
  records: StoredWeeklyTimesheetRecord[],
): Promise<void> {
  await ensureMockTimesheetStoreFile();
  await fs.writeFile(
    MOCK_TIMESHEET_STORE_PATH,
    JSON.stringify(records, null, 2),
    "utf8",
  );
}

function upsertTimesheet(
  records: StoredWeeklyTimesheetRecord[],
  record: StoredWeeklyTimesheetRecord,
): void {
  const index = records.findIndex((item) => item.weekStart === record.weekStart);
  if (index >= 0) {
    records[index] = record;
    return;
  }
  records.push(record);
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

    const [draftRecords, submittedSummaries] = await Promise.all([
      readTimesheetStore(),
      consultantId ? listSubmittedTimesheetSummariesForConsultant(consultantId) : Promise.resolve([]),
    ]);

    const combined = new Map<string, TimesheetSummaryRecord>();

    draftRecords
      .map(toTimesheetSummaryFromRecord)
      .forEach((record) => combined.set(record.weekStart, record));

    submittedSummaries.forEach((record) => combined.set(record.weekStart, record));

    return Array.from(combined.values()).sort((left, right) => right.weekStart.localeCompare(left.weekStart));
  },

  async createNewWeeklyTimesheet(): Promise<WeeklyTimesheetRecord> {
    const consultantId = await getAuthenticatedConsultantId();
    const records = await readTimesheetStore();
    const submittedWeekStarts = consultantId
      ? (await listSubmittedTimesheetSummariesForConsultant(consultantId)).map((record) => record.weekStart)
      : [];

    const existingWeekStarts = new Set(
      records.map((record) => record.weekStart),
    );

    submittedWeekStarts.forEach((weekStart) => existingWeekStarts.add(weekStart));

    let candidateWeekStartDate = resolveWeekStart();
    while (existingWeekStarts.has(toIsoDate(candidateWeekStartDate))) {
      candidateWeekStartDate = addDays(candidateWeekStartDate, 7);
    }

    const created = buildStoredTimesheet(toIsoDate(candidateWeekStartDate), {
      status: "draft",
    });
    upsertTimesheet(records, created);
    await writeTimesheetStore(records);

    return toWeeklyRecord(created);
  },

  async getWeeklyTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const consultantId = await getAuthenticatedConsultantId();
    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    const existingRecord = records.find(
      (record) => record.weekStart === normalizedWeekStart,
    );

    if (existingRecord) {
      return toWeeklyRecord(existingRecord);
    }

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

    const fallback = buildStoredTimesheet(normalizedWeekStart, {
      status: "draft",
    });

    return toWeeklyRecord(fallback);
  },

  async getWeeklyTimesheetById(timesheetId: string): Promise<WeeklyTimesheetRecord> {
    const consultantId = await getAuthenticatedConsultantId();
    const records = await readTimesheetStore();
    const record = records.find((item) => item.id === timesheetId);
    if (!record) {
      if (consultantId) {
        const submittedRecord = await findSubmittedTimesheetById(consultantId, timesheetId);
        if (submittedRecord) {
          const entries = await fetchSubmittedTimesheetEntries(submittedRecord.id);
          const projectIds = Array.from(new Set(entries.map((entry) => entry.project_id)));
          const projectCodeById = await fetchProjectCodesByIds(projectIds);

          return toWeeklyRecordFromDb(submittedRecord, entries, projectCodeById);
        }
      }

      throw new Error("Timesheet not found");
    }

    return toWeeklyRecord(record);
  },

  async saveWeeklyTimesheetDraft(input: SaveTimesheetInput): Promise<{ savedAt: string }> {
    validateTimesheetEntries(input.entries);
    const consultantId = await getAuthenticatedConsultantId();
    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    const existingRecord = input.id
      ? records.find((record) => record.id === input.id)
      : records.find((record) => record.weekStart === normalizedWeekStart);

    if (input.id && !existingRecord) {
      throw new Error("Timesheet not found");
    }

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
    const savedRecord = buildStoredTimesheet(normalizedWeekStart, {
      id: existingRecord?.id,
      status: "draft",
      entries: input.entries,
      updatedAt: savedAt,
    });

    upsertTimesheet(records, savedRecord);
    await writeTimesheetStore(records);

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

    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    const existingRecord = input.id
      ? records.find((record) => record.id === input.id)
      : records.find((record) => record.weekStart === normalizedWeekStart);

    if (input.id && !existingRecord) {
      throw new Error("Timesheet not found");
    }

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

    await deleteLocalDraftTimesheet(existingRecord?.id ?? input.id ?? "");

    return { submittedAt, timesheetId };
  },

  async deleteDraftTimesheet(timesheetId: string): Promise<void> {
    const records = await readTimesheetStore();
    const index = records.findIndex((record) => record.id === timesheetId);

    if (index < 0) {
      throw new Error("Timesheet not found");
    }

    if (records[index].status !== "draft") {
      throw new Error("Only draft timesheets can be deleted.");
    }

    records.splice(index, 1);
    await writeTimesheetStore(records);
  },
};
