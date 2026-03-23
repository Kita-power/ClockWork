import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ConsultantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout
      roleTag="Consultant"
      userName="Leah Chen"
      subtitle="Create, update, and submit weekly timesheets."
    >
      {children}
    </RoleTopbarLayout>
  );
}
