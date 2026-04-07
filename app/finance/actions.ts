"use server";

import { revalidatePath } from "next/cache";
import { financeService } from "@/services/finance-service";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markTimesheetProcessedAction(input: {
  timesheetId: string;
}): Promise<ActionResult> {
  try {
    if (!input.timesheetId.trim()) {
      return { ok: false, error: "Timesheet ID is required." };
    }

    await financeService.markAsProcessed(input.timesheetId);
    await logAuditSuccess({
      action: "finance.timesheet.mark_processed",
      entityType: "timesheet",
      entityId: input.timesheetId,
    });
    revalidatePath("/finance");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "finance.timesheet.mark_processed",
      entityType: "timesheet",
      entityId: input.timesheetId,
      error: e,
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to mark timesheet as processed",
    };
  }
}
