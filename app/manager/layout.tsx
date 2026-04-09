import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout overviewHref="/manager">
      {children}
    </RoleTopbarLayout>
  );
}