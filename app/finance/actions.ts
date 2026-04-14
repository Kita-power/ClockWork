"use server";

import { revalidatePath } from "next/cache";
import { financeService } from "@/services/finance-service";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markTimesheetsExportedAction(input: {
  timesheetIds: string[];
}): Promise<ActionResult> {
  try {
    const timesheetIds = input.timesheetIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (timesheetIds.length === 0) {
      return { ok: false, error: "At least one timesheet ID is required." };
    }

    await financeService.markAsExported(timesheetIds);
    await logAuditSuccess({
      action: "finance.timesheet.export",
      entityType: "timesheet",
      metadata: { timesheetIds },
    });
    revalidatePath("/finance");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "finance.timesheet.export",
      entityType: "timesheet",
      metadata: { timesheetIds: input.timesheetIds },
      error: e,
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to record timesheet export",
    };
  }
}

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
