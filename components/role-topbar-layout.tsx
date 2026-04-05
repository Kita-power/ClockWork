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
    setNotifications([
      {
        id: "1",
        title: "Timesheet Submitted",
        description: "Your weekly timesheet has been successfully submitted",
        timestamp: new Date(Date.now() - 2 * 3600000),
        read: false,
      },
    ]);
  }, []);

  const handleCloseNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
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
              {isAuthenticated ? (
                <NotificationButton
                  notifications={notifications}
                  onClose={handleCloseNotification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ) : null}
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
