import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";

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

  async listTimesheets(): Promise<TimesheetSummaryRecord[]> {
    const records = await readTimesheetStore();

    return records
      .map(toSummary)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },

  async createNewWeeklyTimesheet(): Promise<WeeklyTimesheetRecord> {
    const records = await readTimesheetStore();

    const existingWeekStarts = new Set(
      records.map((record) => record.weekStart),
    );

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
    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    const existingRecord = records.find(
      (record) => record.weekStart === normalizedWeekStart,
    );

    if (existingRecord) {
      return toWeeklyRecord(existingRecord);
    }

    const fallback = buildStoredTimesheet(normalizedWeekStart, {
      status: "draft",
    });

    return toWeeklyRecord(fallback);
  },

  async getWeeklyTimesheetById(timesheetId: string): Promise<WeeklyTimesheetRecord> {
    const records = await readTimesheetStore();
    const record = records.find((item) => item.id === timesheetId);
    if (!record) {
      throw new Error("Timesheet not found");
    }

    return toWeeklyRecord(record);
  },

  async saveWeeklyTimesheetDraft(input: SaveTimesheetInput): Promise<{ savedAt: string }> {
    validateTimesheetEntries(input.entries);
    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    const existingRecord = input.id
      ? records.find((record) => record.id === input.id)
      : records.find((record) => record.weekStart === normalizedWeekStart);

    if (input.id && !existingRecord) {
      throw new Error("Timesheet not found");
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

  async submitWeeklyTimesheet(input: SaveTimesheetInput): Promise<{ submittedAt: string }> {
    validateTimesheetEntries(input.entries);
    const records = await readTimesheetStore();
    const startDate = resolveWeekStart(input.weekStart);
    const normalizedWeekStart = toIsoDate(startDate);
    const existingRecord = input.id
      ? records.find((record) => record.id === input.id)
      : records.find((record) => record.weekStart === normalizedWeekStart);

    if (input.id && !existingRecord) {
      throw new Error("Timesheet not found");
    }

    const submittedAt = new Date().toISOString();
    const submittedRecord = buildStoredTimesheet(normalizedWeekStart, {
      id: existingRecord?.id,
      status: "submitted",
      entries: input.entries,
      updatedAt: submittedAt,
    });

    upsertTimesheet(records, submittedRecord);
    await writeTimesheetStore(records);

    return { submittedAt };
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
