import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function FinanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout
      roleTag="Finance"
      userName="Eric Voss"
      subtitle="Process approved timesheets and export payroll data."
    >
      {children}
    </RoleTopbarLayout>
  );
}
