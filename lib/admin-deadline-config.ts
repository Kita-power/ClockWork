export const ADMIN_DEADLINE_CONFIG_STORAGE_KEY = "clockwork.admin.consultant-deadline-config";

export const DEADLINE_DAY_OPTIONS = [7, 8, 9, 10] as const;

export const DEADLINE_TIME_OPTIONS = [
  "12:00 AM",
  "1:00 AM",
  "2:00 AM",
  "3:00 AM",
  "4:00 AM",
  "5:00 AM",
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
] as const;

export type DeadlineDayOption = (typeof DEADLINE_DAY_OPTIONS)[number];
export type DeadlineTimeOption = (typeof DEADLINE_TIME_OPTIONS)[number];

export type ReminderOption = "24h" | "48h" | "daily";

export type AdminConsultantDeadlineConfig = {
  daysFromStartOfWeek: DeadlineDayOption;
  timeOfDay: DeadlineTimeOption;
  reminderSchedule: ReminderOption;
};

export const DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG: AdminConsultantDeadlineConfig = {
  daysFromStartOfWeek: 7,
  timeOfDay: "12:00 AM",
  reminderSchedule: "24h",
};

function isValidDay(value: unknown): value is DeadlineDayOption {
  return typeof value === "number" && DEADLINE_DAY_OPTIONS.includes(value as DeadlineDayOption);
}

function isValidTime(value: unknown): value is DeadlineTimeOption {
  return (
    typeof value === "string" &&
    DEADLINE_TIME_OPTIONS.includes(value as DeadlineTimeOption)
  );
}

function isValidReminder(value: unknown): value is ReminderOption {
  return value === "24h" || value === "48h" || value === "daily";
}

export function sanitizeAdminConsultantDeadlineConfig(
  input: unknown,
): AdminConsultantDeadlineConfig {
  if (!input || typeof input !== "object") {
    return DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG;
  }

  const candidate = input as Partial<AdminConsultantDeadlineConfig>;

  return {
    daysFromStartOfWeek: isValidDay(candidate.daysFromStartOfWeek)
      ? candidate.daysFromStartOfWeek
      : DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.daysFromStartOfWeek,
    timeOfDay: isValidTime(candidate.timeOfDay)
      ? candidate.timeOfDay
      : DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.timeOfDay,
    reminderSchedule: isValidReminder(candidate.reminderSchedule)
      ? candidate.reminderSchedule
      : DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG.reminderSchedule,
  };
}

export function loadAdminConsultantDeadlineConfig(): AdminConsultantDeadlineConfig {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG;
  }

  const raw = window.localStorage.getItem(ADMIN_DEADLINE_CONFIG_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG;
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizeAdminConsultantDeadlineConfig(parsed);
  } catch {
    return DEFAULT_ADMIN_CONSULTANT_DEADLINE_CONFIG;
  }
}

export function saveAdminConsultantDeadlineConfig(
  config: AdminConsultantDeadlineConfig,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_DEADLINE_CONFIG_STORAGE_KEY,
    JSON.stringify(sanitizeAdminConsultantDeadlineConfig(config)),
  );
}