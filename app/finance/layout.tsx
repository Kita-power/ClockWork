import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function FinanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout>
      {children}
    </RoleTopbarLayout>
  );
}
