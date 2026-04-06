"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TopbarUserMenu } from "@/components/topbar-user-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationButton } from "@/components/ui/notif-button";
import type { Notification } from "@/components/ui/notif-button";
import { useUser } from "@/hooks/use-user";
import { formatRoleLabel } from "@/lib/format-role-label";
import { createClient } from "@/lib/supabase/client";
import {
  appendNotification,
  createTimesheetApprovedNotification,
  createTimesheetRejectedNotification,
  loadNotifications,
  NOTIFICATION_EVENT_NAME,
  saveNotifications,
  type NotificationEventDetail,
  type StoredNotification,
} from "@/lib/notification-center";

type ConsultantTimesheetStatusRow = {
  id: string;
  status: string;
  week_start_date: string;
  week_end_date: string;
  project_id: string | null;
};

type ProjectCodeRow = {
  id: string;
  code: string;
};

function getTimesheetStatusCacheStorageKey(userId: string): string {
  return `clockwork.timesheet-status-cache:${userId}`;
}

function loadTimesheetStatusCache(userId: string): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(getTimesheetStatusCacheStorageKey(userId));
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveTimesheetStatusCache(userId: string, cache: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getTimesheetStatusCacheStorageKey(userId), JSON.stringify(cache));
}

function toUiNotification(notification: StoredNotification): Notification {
  return {
    ...notification,
    timestamp: new Date(notification.timestamp),
  };
}

function toStoredNotification(notification: Notification): StoredNotification {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.description,
    timestamp:
      notification.timestamp instanceof Date
        ? notification.timestamp.toISOString()
        : new Date().toISOString(),
    read: notification.read ?? false,
  };
}

type RoleTopbarLayoutProps = {
  subtitle: string;
  overviewHref?: string;
  children: React.ReactNode;
};

export function RoleTopbarLayout({
  subtitle,
  overviewHref,
  children,
}: RoleTopbarLayoutProps) {
  const pathname = usePathname();
  const overviewPath = overviewHref ?? pathname;
  const tabsValue = pathname.startsWith(overviewPath) ? overviewPath : pathname;
  const { id: userId, fullName, email, role, isLoading, isAuthenticated } = useUser();
  const displayName = fullName.trim() || email || "User";

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(loadNotifications().map(toUiNotification));
  }, []);

  useEffect(() => {
    const handleNotificationAdded = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationEventDetail>;
      setNotifications((prev) => [toUiNotification(customEvent.detail), ...prev]);
    };

    const handleStorageSync = () => {
      setNotifications(loadNotifications().map(toUiNotification));
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, handleNotificationAdded);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENT_NAME, handleNotificationAdded);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || role !== "consultant" || !userId) {
      return;
    }

    const supabase = createClient();
    let isCancelled = false;

    const maybeNotifyStatusChange = async (
      row: ConsultantTimesheetStatusRow,
      previousStatus: string | undefined,
      projectCodeOverride?: string,
    ) => {
      const normalizedStatus = String(row.status ?? "").trim().toLowerCase();

      if (!previousStatus || previousStatus === normalizedStatus) {
        return;
      }

      if (normalizedStatus !== "approved" && normalizedStatus !== "rejected") {
        return;
      }

      if (!row.week_start_date || !row.week_end_date) {
        return;
      }

      let projectCode = projectCodeOverride ?? "";

      if (!projectCode && row.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("code")
          .eq("id", row.project_id)
          .maybeSingle();

        if (!projectError) {
          projectCode = projectData?.code ?? "";
        }
      }

      if (!projectCode) {
        return;
      }

      if (normalizedStatus === "approved") {
        appendNotification(
          createTimesheetApprovedNotification({
            projectCode,
            weekStart: row.week_start_date,
            weekEnd: row.week_end_date,
          }),
        );
      }

      if (normalizedStatus === "rejected") {
        appendNotification(
          createTimesheetRejectedNotification({
            projectCode,
            weekStart: row.week_start_date,
            weekEnd: row.week_end_date,
          }),
        );
      }
    };

    const syncTimesheetStatusNotifications = async (notifyOnChange: boolean) => {
      const { data: timesheetData, error: timesheetError } = await supabase
        .from("timesheets")
        .select("id, status, week_start_date, week_end_date, project_id")
        .eq("consultant_id", userId);

      if (timesheetError || isCancelled) {
        return;
      }

      const rows = (timesheetData ?? []) as ConsultantTimesheetStatusRow[];
      const projectIds = Array.from(
        new Set(rows.map((row) => row.project_id).filter((value): value is string => Boolean(value))),
      );
      const projectCodeById = new Map<string, string>();

      if (projectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, code")
          .in("id", projectIds);

        if (!projectError) {
          for (const row of (projectData ?? []) as ProjectCodeRow[]) {
            projectCodeById.set(row.id, row.code);
          }
        }
      }

      const previousCache = loadTimesheetStatusCache(userId);
      const nextCache: Record<string, string> = {};

      for (const row of rows) {
        const normalizedStatus = String(row.status ?? "").trim().toLowerCase();
        nextCache[row.id] = normalizedStatus;

        if (!notifyOnChange) {
          continue;
        }

        const previousStatus = previousCache[row.id];
        const projectCode = row.project_id ? projectCodeById.get(row.project_id) ?? "" : "";
        await maybeNotifyStatusChange(row, previousStatus, projectCode);
      }

      saveTimesheetStatusCache(userId, nextCache);
    };

    void syncTimesheetStatusNotifications(true);

    const channel = supabase
      .channel(`consultant-timesheet-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "timesheets",
          filter: `consultant_id=eq.${userId}`,
        },
        async (payload) => {
          if (isCancelled) {
            return;
          }

          const newRow = payload.new as Partial<ConsultantTimesheetStatusRow>;
          if (!newRow.id) {
            return;
          }

          const nextRow: ConsultantTimesheetStatusRow = {
            id: newRow.id,
            status: String(newRow.status ?? ""),
            week_start_date: String(newRow.week_start_date ?? ""),
            week_end_date: String(newRow.week_end_date ?? ""),
            project_id: typeof newRow.project_id === "string" ? newRow.project_id : null,
          };

          const cache = loadTimesheetStatusCache(userId);
          const previousStatus = cache[nextRow.id];
          cache[nextRow.id] = String(nextRow.status ?? "").trim().toLowerCase();
          saveTimesheetStatusCache(userId, cache);

          await maybeNotifyStatusChange(nextRow, previousStatus);
        },
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void syncTimesheetStatusNotifications(true);
    }, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, role, userId]);

  const handleCloseNotification = (id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotifications(next.map(toStoredNotification));
      return next;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next.map(toStoredNotification));
      return next;
    });
  };

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-4 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Clockwork</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <Tabs value={tabsValue} className="mt-3">
              <TabsList>
                <TabsTrigger value={overviewPath} asChild>
                  <Link href={overviewPath} prefetch={false}>
                    Overview
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
              ) : isAuthenticated ? (
                <TopbarUserMenu userName={displayName} />
              ) : (
                <Link
                  href="/auth/login"
                  className="text-sm font-semibold underline underline-offset-4"
                >
                  Log in
                </Link>
              )}
              {isAuthenticated ? (
                <NotificationButton
                  notifications={notifications}
                  onClose={handleCloseNotification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ) : null}
            </div>
            <Badge variant="secondary">
              {isLoading
                ? "…"
                : isAuthenticated
                  ? formatRoleLabel(role)
                  : "Guest"}
            </Badge>
          </div>
        </div>
        <Separator />
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
        <section>{children}</section>
      </div>
    </main>
  );
}
