import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout
      subtitle="Review, approve, and reject submitted timesheets."
      overviewHref="/manager"
    >
      {children}
    </RoleTopbarLayout>
  );
}