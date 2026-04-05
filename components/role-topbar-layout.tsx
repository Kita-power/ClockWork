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
import {
  loadNotifications,
  NOTIFICATION_EVENT_NAME,
  saveNotifications,
  type NotificationEventDetail,
  type StoredNotification,
} from "@/lib/notification-center";

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
  const { fullName, email, role, isLoading, isAuthenticated } = useUser();
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
