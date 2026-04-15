import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/role-home-path";

function HomeFallback() {
  return <div className="min-h-svh bg-muted/30" aria-hidden />;
}

async function HomeRedirect() {
  await connection();
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
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeRedirect />
    </Suspense>
  );
}
