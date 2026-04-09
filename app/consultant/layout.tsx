import { RoleTopbarLayout } from "@/components/role-topbar-layout";

export default function ConsultantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoleTopbarLayout overviewHref="/consultant">
      {children}
    </RoleTopbarLayout>
  );
}
