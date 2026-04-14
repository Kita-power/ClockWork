export type StoredNotification = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
};

export const NOTIFICATION_STORAGE_KEY = "clockwork.notifications";
export const NOTIFICATION_EVENT_NAME = "clockwork:notification-added";
export const NOTIFIED_TIMESHEETS_KEY = "clockwork.notified-timesheets";

export type NotificationEventDetail = StoredNotification;

export function formatDateForNotification(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function createTimesheetSubmittedNotification(input: {
  projectCode: string;
  weekStart: string;
  weekEnd: string;
  isLate?: boolean;
}): StoredNotification {
  const submittedStatusText = input.isLate ? "submitted late" : "submitted";
  const weekRangeText = `${formatDateForNotification(input.weekStart)} to ${formatDateForNotification(input.weekEnd)}`;

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    title: input.isLate ? "Timesheet Submitted Late" : "Timesheet Submitted",
    description: `The timesheet for project code ${input.projectCode} for the week of ${weekRangeText} has been ${submittedStatusText}.`,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export function createTimesheetApprovedNotification(input: {
  projectCode: string;
  weekStart: string;
  weekEnd: string;
  isLate?: boolean;
}): StoredNotification {
  const weekRangeText = `${formatDateForNotification(input.weekStart)} to ${formatDateForNotification(input.weekEnd)}`;

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    title: input.isLate ? "Timesheet Approved Late" : "Timesheet Approved",
    description: `Your timesheet for project code ${input.projectCode} for the week of ${weekRangeText} has been ${input.isLate ? "approved as a late submission" : "approved"} by your manager.`,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export function createTimesheetRejectedNotification(input: {
  projectCode: string;
  weekStart: string;
  weekEnd: string;
}): StoredNotification {
  const weekRangeText = `${formatDateForNotification(input.weekStart)} to ${formatDateForNotification(input.weekEnd)}`;

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    title: "Timesheet Rejected",
    description: `Your timesheet for project code ${input.projectCode} for the week of ${weekRangeText} has been rejected. Please review the feedback and resubmit.`,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export function loadNotifiedTimesheetIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  const raw = window.localStorage.getItem(NOTIFIED_TIMESHEETS_KEY);

  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markTimesheetAsNotified(timesheetId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const notified = loadNotifiedTimesheetIds();
  notified.add(timesheetId);
  window.localStorage.setItem(NOTIFIED_TIMESHEETS_KEY, JSON.stringify(Array.from(notified)));
}

export function loadNotifications(): StoredNotification[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: StoredNotification[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
}

export function appendNotification(notification: StoredNotification): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = loadNotifications();
  const nextNotifications = [notification, ...existing].slice(0, 50);
  saveNotifications(nextNotifications);

  window.dispatchEvent(
    new CustomEvent<NotificationEventDetail>(NOTIFICATION_EVENT_NAME, {
      detail: notification,
    }),
  );
}

export function clearNotificationState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  window.localStorage.removeItem(NOTIFIED_TIMESHEETS_KEY);
}
