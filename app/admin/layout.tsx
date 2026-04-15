import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { AdminLayoutClient } from "./admin-layout-client";

function AdminLayoutFallback() {
  return (
    <main className="min-h-svh bg-muted/30">
      <header className="bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-4 px-5 py-4 md:px-8">
          <div className="space-y-3">
            <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-72 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <Separator />
      </header>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
        <div className="h-64 animate-pulse rounded-md bg-muted/50" />
      </div>
    </main>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}
