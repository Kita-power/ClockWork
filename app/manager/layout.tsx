import { Suspense } from "react";
import {
  RoleTopbarLayout,
  RoleTopbarLayoutFallback,
} from "@/components/role-topbar-layout";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<RoleTopbarLayoutFallback />}>
      <RoleTopbarLayout overviewHref="/manager">{children}</RoleTopbarLayout>
    </Suspense>
  );
}