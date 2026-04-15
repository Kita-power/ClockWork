import { Suspense } from "react";
import {
  RoleTopbarLayout,
  RoleTopbarLayoutFallback,
} from "@/components/role-topbar-layout";

export default function ConsultantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<RoleTopbarLayoutFallback />}>
      <RoleTopbarLayout overviewHref="/consultant">{children}</RoleTopbarLayout>
    </Suspense>
  );
}
