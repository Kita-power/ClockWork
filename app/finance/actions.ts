"use server";

import { revalidatePath } from "next/cache";
import { financeService } from "@/services/finance-service";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markTimesheetProcessedAction(input: {
  timesheetId: string;
}): Promise<ActionResult> {
  try {
    if (!input.timesheetId.trim()) {
      return { ok: false, error: "Timesheet ID is required." };
    }

    await financeService.markAsProcessed(input.timesheetId);
    revalidatePath("/finance");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to mark timesheet as processed",
    };
  }
}
