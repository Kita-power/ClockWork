"use server";

import { revalidatePath } from "next/cache";
import { consultantService } from "@/services";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";
import type {
  SaveTimesheetInput,
  TimesheetStatus,
  WeeklyTimesheetRecord,
} from "@/services/consultant-service";

type ActionResult =
  | { ok: true; message: string; timesheetId?: string; status?: TimesheetStatus }
  | { ok: false; error: string };

type LoadTimesheetResult =
  | { ok: true; timesheet: WeeklyTimesheetRecord }
  | { ok: false; error: string };

type CreateTimesheetResult =
  | { ok: true; timesheetId: string }
  | { ok: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("timesheets_unique_consultant_week_project") ||
      (normalizedMessage.includes("duplicate key value") &&
        normalizedMessage.includes("unique constraint"))
    ) {
      return "A timesheet for this week and project code already exists. Open the existing timesheet to update it instead of creating another one.";
    }

    return message;
  }

  return "Unexpected error";
}

export async function loadConsultantWeeklyTimesheetAction(
  weekStart?: string,
): Promise<LoadTimesheetResult> {
  try {
    const timesheet = await consultantService.getWeeklyTimesheet(weekStart);
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function loadConsultantWeeklyDraftTimesheetAction(
  weekStart?: string,
): Promise<LoadTimesheetResult> {
  try {
    const timesheet = await consultantService.getWeeklyDraftTimesheet(weekStart);
    return { ok: true, timesheet };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function saveConsultantTimesheetDraftAction(
  input: SaveTimesheetInput,
): Promise<ActionResult> {
  try {
    const result = await consultantService.saveWeeklyTimesheetDraft(input);
    await logAuditSuccess({
      action: "consultant.timesheet.save_draft",
      entityType: "timesheet",
      entityId: result.timesheetId,
      metadata: { weekStart: input.weekStart },
    });
    revalidatePath("/consultant");
    revalidatePath("/admin/audit-logs");
    return { ok: true, message: "Draft saved", timesheetId: result.timesheetId };
  } catch (error) {
    await logAuditFailure({
      action: "consultant.timesheet.save_draft",
      entityType: "timesheet",
      metadata: { weekStart: input.weekStart },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function submitConsultantTimesheetAction(
  input: SaveTimesheetInput,
): Promise<ActionResult> {
  try {
    const result = await consultantService.submitWeeklyTimesheet(input);
    await logAuditSuccess({
      action: "consultant.timesheet.submit",
      entityType: "timesheet",
      entityId: result.timesheetId,
      metadata: { weekStart: input.weekStart, status: result.status },
    });
    revalidatePath("/consultant");
    revalidatePath("/admin/audit-logs");
    return {
      ok: true,
      message:
        result.status === "submitted_late"
          ? "Timesheet submitted late"
          : "Timesheet submitted",
      timesheetId: result.timesheetId,
      status: result.status,
    };
  } catch (error) {
    await logAuditFailure({
      action: "consultant.timesheet.submit",
      entityType: "timesheet",
      metadata: { weekStart: input.weekStart },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function createConsultantTimesheetAction(): Promise<CreateTimesheetResult> {
  try {
    const timesheet = await consultantService.createNewWeeklyTimesheet();
    revalidatePath("/consultant");
    return { ok: true, timesheetId: timesheet.id };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function deleteConsultantDraftTimesheetAction(
  timesheetId: string,
): Promise<ActionResult> {
  try {
    await consultantService.deleteDraftTimesheet(timesheetId);
    await logAuditSuccess({
      action: "consultant.timesheet.delete_draft",
      entityType: "timesheet",
      entityId: timesheetId,
    });
    revalidatePath("/consultant");
    revalidatePath("/admin/audit-logs");
    return { ok: true, message: "Draft timesheet deleted" };
  } catch (error) {
    await logAuditFailure({
      action: "consultant.timesheet.delete_draft",
      entityType: "timesheet",
      entityId: timesheetId,
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}
