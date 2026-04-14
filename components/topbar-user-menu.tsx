"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearNotificationState } from "@/lib/notification-center";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

type TopbarUserMenuProps = {
  userName: string;
  roleLabel?: string;
};

export function TopbarUserMenu({ userName, roleLabel }: TopbarUserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const initials = initialsFromName(userName);

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      clearNotificationState();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-2 rounded-md px-1.5 py-1 font-normal hover:bg-muted/60"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[12rem] truncate text-sm font-semibold">{userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56 p-2">
        {roleLabel ? (
          <>
            <DropdownMenuLabel className="px-1 pt-0 pb-1">
              <Badge variant="secondary" className="w-fit">
                {roleLabel}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={isPending}
          className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={() => signOut()}
        >
          <LogOut className="size-4" />
          {isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
