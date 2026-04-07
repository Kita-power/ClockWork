import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/role-home-path";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  redirect(getRoleHomePath(profile?.role));
}
