import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/role-home-path";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    redirect(getRoleHomePath(profile?.role));
  }

  return (
    <main className="min-h-svh bg-muted/30 p-6 md:p-10">
      <section className="mx-auto grid min-h-[560px] w-full max-w-5xl overflow-hidden rounded-3xl border bg-background md:grid-cols-2">
        <Card className="hidden rounded-none border-0 md:flex md:flex-col md:justify-between">
          <CardHeader>
            <CardTitle className="text-4xl">Clockwork</CardTitle>
            <CardDescription className="max-w-sm pt-3 text-sm">
              High-efficiency timesheet operations for consultants, managers,
              finance, and administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="max-w-sm text-sm text-muted-foreground">
              Precision workflow cockpit for auditable approvals, rapid review,
              and payroll-ready handoffs.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center bg-muted/20 p-6 md:p-12">
          <LoginForm className="w-full max-w-md" />
        </div>
      </section>
    </main>
  );
}
