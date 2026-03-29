export type TimesheetStatus = "draft" | "submitted";

export type WeeklyTimesheetEntry = {
  date: string;
  dayLabel: string;
  projectCode: string;
  hours: number;
  notes: string;
};

export type WeeklyTimesheetRecord = {
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
  weekStart: string;
  entries: WeeklyTimesheetEntry[];
};

type StoredWeeklyTimesheetRecord = WeeklyTimesheetRecord & {
  id: string;
  updatedAt: string;
};

let timesheetStore: StoredWeeklyTimesheetRecord[] | null = null;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function buildTimesheetId(weekStart: string): string {
  return `ts-${weekStart}`;
}

function resolveWeekStart(inputWeekStart?: string): Date {
  if (inputWeekStart) {
    return new Date(`${inputWeekStart}T00:00:00`);
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
  };
}

function buildWeekEntries(weekStart: string): WeeklyTimesheetEntry[] {
  const startDate = resolveWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const current = addDays(startDate, index);
    return buildEntry(current);
  });
}

function cloneEntries(entries: WeeklyTimesheetEntry[]): WeeklyTimesheetEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

function buildStoredTimesheet(
  weekStart: string,
  input?: {
    status?: TimesheetStatus;
    entries?: WeeklyTimesheetEntry[];
    updatedAt?: string;
  },
): StoredWeeklyTimesheetRecord {
  const startDate = resolveWeekStart(weekStart);
  const normalizedWeekStart = toIsoDate(startDate);
  const endDate = addDays(startDate, 6);

  return {
    id: buildTimesheetId(normalizedWeekStart),
    weekStart: normalizedWeekStart,
    weekEnd: toIsoDate(endDate),
    status: input?.status ?? "draft",
    entries: cloneEntries(input?.entries ?? buildWeekEntries(normalizedWeekStart)),
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
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    status: record.status,
    entries: cloneEntries(record.entries),
  };
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

function getTimesheetStore(): StoredWeeklyTimesheetRecord[] {
  if (timesheetStore === null) {
    timesheetStore = seedTimesheetStore();
  }
  return timesheetStore;
}

function upsertTimesheet(record: StoredWeeklyTimesheetRecord): void {
  const store = getTimesheetStore();
  const index = store.findIndex((item) => item.weekStart === record.weekStart);
  if (index >= 0) {
    store[index] = record;
    return;
  }
  store.push(record);
}

export const consultantService = {
  description:
    "Handles consultant workflows such as draft, submit, and resubmit timesheets.",

  async listTimesheets(): Promise<TimesheetSummaryRecord[]> {
    return getTimesheetStore()
      .map(toSummary)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },

  async createNewWeeklyTimesheet(): Promise<WeeklyTimesheetRecord> {
    const existingWeekStarts = new Set(
      getTimesheetStore().map((record) => record.weekStart),
    );

    let candidateWeekStartDate = resolveWeekStart();
    while (existingWeekStarts.has(toIsoDate(candidateWeekStartDate))) {
      candidateWeekStartDate = addDays(candidateWeekStartDate, 7);
    }

    const created = buildStoredTimesheet(toIsoDate(candidateWeekStartDate), {
      status: "draft",
    });
    upsertTimesheet(created);
    return toWeeklyRecord(created);
  },

  async getWeeklyTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const startDate = resolveWeekStart(weekStart);
    const normalizedWeekStart = toIsoDate(startDate);

    const existingRecord = getTimesheetStore().find(
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

  async saveWeeklyTimesheetDraft(input: SaveTimesheetInput): Promise<{ savedAt: string }> {
    const savedAt = new Date().toISOString();
    const savedRecord = buildStoredTimesheet(input.weekStart, {
      status: "draft",
      entries: input.entries,
      updatedAt: savedAt,
    });

    upsertTimesheet(savedRecord);
    return { savedAt };
  },

  async submitWeeklyTimesheet(input: SaveTimesheetInput): Promise<{ submittedAt: string }> {
    const submittedAt = new Date().toISOString();
    const submittedRecord = buildStoredTimesheet(input.weekStart, {
      status: "submitted",
      entries: input.entries,
      updatedAt: submittedAt,
    });

    upsertTimesheet(submittedRecord);
    return { submittedAt };
  },
};
