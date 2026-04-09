import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
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
      <section className="mx-auto flex min-h-[560px] w-full max-w-5xl items-center justify-center">
        <LoginForm className="w-full max-w-md" />
      </section>
    </main>
  );
}
