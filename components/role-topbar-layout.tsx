"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { TopbarUserMenu } from "@/components/topbar-user-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationButton } from "@/components/ui/notif-button";
import type { Notification } from "@/components/ui/notif-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "next-themes";
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

type ProjectNameRow = {
  id: string;
  name: string;
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
  overviewHref?: string;
  children: React.ReactNode;
};

/** Shell shown while pathname-dependent UI streams (Cache Components / PPR). */
export function RoleTopbarLayoutFallback() {
  return (
    <main className="flex h-svh flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-3 py-4 md:px-5">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <Separator />
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col overflow-hidden px-3 py-6 md:px-5 md:py-8">
        <section className="min-h-0 flex-1 overflow-y-auto">
          <div className="h-48 w-full animate-pulse rounded-md bg-muted/50" />
        </section>
      </div>
    </main>
  );
}

export function RoleTopbarLayout({
  overviewHref,
  children,
}: RoleTopbarLayoutProps) {
  const pathname = usePathname();
  const overviewPath = overviewHref ?? pathname;
  const navItems = [{ label: "Overview", href: overviewPath }];
  const tabsValue = pathname.startsWith(overviewPath) ? overviewPath : pathname;
  const isOverviewPage = pathname === overviewPath;
  const { theme, setTheme } = useTheme();
  const { id: userId, fullName, email, role, isLoading, isAuthenticated } = useUser();
  const displayName = fullName.trim() || email || "User";

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!isOverviewPage || theme !== "system") {
      return;
    }

    setTheme("dark");
  }, [isOverviewPage, theme, setTheme]);

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
      projectNameOverride?: string,
    ) => {
      const normalizedStatus = String(row.status ?? "").trim().toLowerCase();

      if (!previousStatus || previousStatus === normalizedStatus) {
        return;
      }

      if (
        normalizedStatus !== "approved" &&
        normalizedStatus !== "approved_late" &&
        normalizedStatus !== "rejected"
      ) {
        return;
      }

      if (!row.week_start_date || !row.week_end_date) {
        return;
      }

      let projectName = projectNameOverride ?? "";

      if (!projectName && row.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("name")
          .eq("id", row.project_id)
          .maybeSingle();

        if (!projectError) {
          projectName = projectData?.name ?? "";
        }
      }

      if (!projectName) {
        return;
      }

      if (normalizedStatus === "approved" || normalizedStatus === "approved_late") {
        appendNotification(
          createTimesheetApprovedNotification({
            projectName,
            weekStart: row.week_start_date,
            weekEnd: row.week_end_date,
            isLate: normalizedStatus === "approved_late",
          }),
        );
      }

      if (normalizedStatus === "rejected") {
        appendNotification(
          createTimesheetRejectedNotification({
            projectName,
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
      const projectNameById = new Map<string, string>();

      if (projectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds);

        if (!projectError) {
          for (const row of (projectData ?? []) as ProjectNameRow[]) {
            projectNameById.set(row.id, row.name);
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
        const projectName = row.project_id ? projectNameById.get(row.project_id) ?? "" : "";
        await maybeNotifyStatusChange(row, previousStatus, projectName);
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
    <main className="flex h-svh flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-3 py-4 md:px-5">
          <div className="min-w-0">
            <Link
              href={overviewPath}
              prefetch={false}
              aria-label="Go to overview"
              className="inline-flex items-center gap-2 sm:gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h1 className="clockwork-branding text-xl font-semibold tracking-tight sm:text-3xl">
                ClockWork
              </h1>
              <span
                aria-hidden="true"
                className="text-base leading-none text-muted-foreground sm:text-3xl"
              >
                |
              </span>
              <Image
                src="/fdm-logo.svg"
                alt="FDM logo"
                width={72}
                height={23}
                className="h-3 w-auto sm:h-6 dark:hidden"
              />
              <Image
                src="/fdm-logo-dark.svg"
                alt="FDM logo"
                width={72}
                height={23}
                className="hidden h-3 w-auto sm:h-6 dark:block"
              />
            </Link>
            {navItems.length > 1 ? (
              <Tabs value={tabsValue} className="mt-3">
                <TabsList>
                  {navItems.map((item) => (
                    <TabsTrigger key={item.href} value={item.href} asChild>
                      <Link href={item.href} prefetch={false}>
                        {item.label}
                      </Link>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              {isLoading ? (
                <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
              ) : isAuthenticated ? (
                <TopbarUserMenu userName={displayName} roleLabel={formatRoleLabel(role)} />
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
          </div>
        </div>
        <Separator />
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col overflow-hidden px-3 py-6 md:px-5 md:py-8">
        <section
          className={`min-h-0 flex-1 ${
            isOverviewPage ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
