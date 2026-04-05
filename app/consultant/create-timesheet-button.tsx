"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateTimesheetButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.push("/consultant/new");
        });
      }}
    >
      {isPending ? "Creating..." : "New Timesheet"}
    </Button>
  );
}
