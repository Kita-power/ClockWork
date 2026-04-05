import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ConsultantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout
      subtitle="Create, update, and submit weekly timesheets."
      overviewHref="/consultant"
    >
      {children}
    </RoleTopbarLayout>
  );
}
