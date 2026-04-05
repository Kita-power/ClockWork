export type StoredNotification = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
};

export const NOTIFICATION_STORAGE_KEY = "clockwork.notifications";
export const NOTIFICATION_EVENT_NAME = "clockwork:notification-added";

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
