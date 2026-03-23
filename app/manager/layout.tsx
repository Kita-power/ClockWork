import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout
      roleTag="Manager"
      userName="Tyson Shah"
      subtitle="Review, approve, and reject submitted timesheets."
    >
      {children}
    </RoleTopbarLayout>
  );
}
