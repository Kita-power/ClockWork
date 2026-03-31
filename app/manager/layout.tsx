"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { RoleTopbarLayout } from "@/components/role-topbar-layout";
import { Badge } from "@/components/ui/badge";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { fullName, role, isLoading, isAuthenticated } = useUser();

  const userName = isLoading
    ? "Loading..."
    : isAuthenticated
      ? fullName || "Manager"
      : "Guest";

  const roleLabel = isLoading
    ? "Loading…"
    : isAuthenticated
      ? role
        ? role.charAt(0).toUpperCase() + role.slice(1)
        : "Unknown"
      : "Guest";

  return (
    <RoleTopbarLayout
      roleTag="Manager"
      userName={userName}
      subtitle="Review, approve, and reject submitted timesheets."
    >
      <div className="space-y-4">
        {/* Not logged in banner, but DON'T block any actions */}
        {!isLoading && !isAuthenticated ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            You’re not logged in. You can still explore and click everything, but
            nothing is connected to a real account yet.{" "}
            <Link
              href="/auth/login"
              className="font-medium underline underline-offset-4"
            >
              Log in
            </Link>
          </div>
        ) : null}

        {/* Corner status indicator inside page content */}
        <div className="flex items-center justify-end gap-2">
          <Badge variant="secondary">{roleLabel}</Badge>
          {!isLoading && !isAuthenticated ? (
            <Link
              href="/auth/login"
              className="text-sm font-semibold underline underline-offset-4"
            >
              Log in
            </Link>
          ) : null}
        </div>

        {children}
      </div>
    </RoleTopbarLayout>
  );
}