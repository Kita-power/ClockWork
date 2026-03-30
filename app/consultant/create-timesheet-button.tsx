"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createConsultantTimesheetAction } from "./actions";

export function CreateTimesheetButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={isPending}
        onClick={() => {
          setErrorMessage(null);

          startTransition(() => {
            createConsultantTimesheetAction().then((result) => {
              if (!result.ok) {
                setErrorMessage(result.error);
                return;
              }

              router.push(`/consultant/timesheets/${result.timesheetId}`);
            });
          });
        }}
      >
        {isPending ? "Creating..." : "Create Timesheet"}
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
