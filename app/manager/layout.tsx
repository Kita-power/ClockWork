"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isLoading, isAuthenticated } = useUser();

  return (
    <RoleTopbarLayout subtitle="Review, approve, and reject submitted timesheets.">
      <div className="space-y-4">
        {!isLoading && !isAuthenticated ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            You’re not logged in. You can still explore the manager prototype,
            but changes are only simulated for now.{" "}
            <Link
              href="/auth/login"
              className="font-medium underline underline-offset-4"
            >
              Log in
            </Link>
          </div>
        ) : null}

        {children}
      </div>
    </RoleTopbarLayout>
  );
}