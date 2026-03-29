"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateTimesheetButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => {
        router.push(`/consultant/new?create=1&t=${Date.now()}`);
      }}
    >
      Create Timesheet
    </Button>
  );
}
