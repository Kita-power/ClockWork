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

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
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

export const consultantService = {
  description:
    "Handles consultant workflows such as draft, submit, and resubmit timesheets.",

  async listTimesheets(): Promise<TimesheetSummaryRecord[]> {
    const currentWeekStart = resolveWeekStart();
    const currentWeekEnd = addDays(currentWeekStart, 6);
    const previousWeekStart = addDays(currentWeekStart, -7);
    const previousWeekEnd = addDays(previousWeekStart, 6);
    const twoWeeksAgoStart = addDays(currentWeekStart, -14);
    const twoWeeksAgoEnd = addDays(twoWeeksAgoStart, 6);

    return [
      {
        id: "ts-current-week",
        weekStart: toIsoDate(currentWeekStart),
        weekEnd: toIsoDate(currentWeekEnd),
        status: "draft",
        totalHours: 31.5,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ts-previous-week",
        weekStart: toIsoDate(previousWeekStart),
        weekEnd: toIsoDate(previousWeekEnd),
        status: "submitted",
        totalHours: 40,
        updatedAt: addDays(new Date(), -4).toISOString(),
      },
      {
        id: "ts-two-weeks-ago",
        weekStart: toIsoDate(twoWeeksAgoStart),
        weekEnd: toIsoDate(twoWeeksAgoEnd),
        status: "submitted",
        totalHours: 38.75,
        updatedAt: addDays(new Date(), -11).toISOString(),
      },
    ];
  },

  async getWeeklyTimesheet(weekStart?: string): Promise<WeeklyTimesheetRecord> {
    const startDate = resolveWeekStart(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const entries = Array.from({ length: 7 }, (_, index) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + index);
      return buildEntry(current);
    });

    return {
      weekStart: toIsoDate(startDate),
      weekEnd: toIsoDate(endDate),
      status: "draft",
      entries,
    };
  },

  async saveWeeklyTimesheetDraft(_input: SaveTimesheetInput): Promise<{ savedAt: string }> {
    return { savedAt: new Date().toISOString() };
  },

  async submitWeeklyTimesheet(_input: SaveTimesheetInput): Promise<{ submittedAt: string }> {
    return { submittedAt: new Date().toISOString() };
  },
};
