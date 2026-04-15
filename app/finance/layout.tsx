import { Suspense } from "react";
import {
  RoleTopbarLayout,
  RoleTopbarLayoutFallback,
} from "@/components/role-topbar-layout";

export default function FinanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<RoleTopbarLayoutFallback />}>
      <RoleTopbarLayout>{children}</RoleTopbarLayout>
    </Suspense>
  );
}
