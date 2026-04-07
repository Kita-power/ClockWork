"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { formatRoleLabel } from "@/lib/format-role-label";
import { TopbarUserMenu } from "@/components/topbar-user-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { fullName, email, role, isLoading, isAuthenticated } = useUser();
  const displayName = fullName.trim() || email || "User";

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-4 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Clockwork</h1>
            <Tabs value={pathname} className="mt-3">
              <TabsList className="h-auto flex-wrap">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.href} value={tab.href} asChild>
                    <Link href={tab.href}>{tab.label}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
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
              {isLoading ? "…" : isAuthenticated ? formatRoleLabel(role) : "Guest"}
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
