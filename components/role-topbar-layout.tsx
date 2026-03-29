"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RoleTopbarLayoutProps = {
  roleTag: string;
  userName: string;
  subtitle: string;
  overviewHref?: string;
  children: React.ReactNode;
};

export function RoleTopbarLayout({
  roleTag,
  userName,
  subtitle,
  overviewHref,
  children,
}: RoleTopbarLayoutProps) {
  const pathname = usePathname();
  const overviewPath = overviewHref ?? pathname;
  const tabsValue = pathname.startsWith(overviewPath) ? overviewPath : pathname;
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

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
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold">{userName}</p>
            </div>
            <Badge variant="secondary">{roleTag}</Badge>
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
