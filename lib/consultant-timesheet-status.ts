import type { TimesheetStatus } from "@/services/consultant-service";

export type ConsultantTimesheetDisplayStatus = TimesheetStatus | "overdue";

function parseIsoDate(input: string): Date {
  const [year, month, day] = input.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function isConsultantTimesheetOverdue(
  status: TimesheetStatus,
  weekStart: string,
  referenceDate = new Date(),
): boolean {
  if (status !== "draft") {
    return false;
  }

  const submissionDeadline = addDays(parseIsoDate(weekStart), 7);
  return referenceDate.getTime() > submissionDeadline.getTime();
}

export function getConsultantTimesheetDisplayStatus(
  status: TimesheetStatus,
  weekStart: string,
  referenceDate = new Date(),
): ConsultantTimesheetDisplayStatus {
  return isConsultantTimesheetOverdue(status, weekStart, referenceDate)
    ? "overdue"
    : status;
}

export function formatConsultantTimesheetStatusLabel(
  status: TimesheetStatus,
  weekStart: string,
  referenceDate = new Date(),
): string {
  const displayStatus = getConsultantTimesheetDisplayStatus(status, weekStart, referenceDate);

  if (displayStatus === "overdue") {
    return "Overdue";
  }

  if (displayStatus === "submitted_late") {
    return "Submitted Late";
  }

  if (displayStatus === "submitted") {
    return "Submitted";
  }

  return "Draft";
}
