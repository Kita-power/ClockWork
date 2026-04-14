"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { clearNotificationState } from "@/lib/notification-center";

type LogoutButtonProps = {
  redirectTo?: string;
  label?: string;
};

export function LogoutButton({
  redirectTo = "/auth/login",
  label = "Logout",
}: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    clearNotificationState();
    await supabase.auth.signOut();
    router.push(redirectTo);
  };

  return (
    <Button onClick={logout} size="sm" variant="outline">
      {label}
    </Button>
  );
}
