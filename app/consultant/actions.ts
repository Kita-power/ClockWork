"use server";

import { revalidatePath } from "next/cache";
import { consultantService } from "@/services";
import type {
  SaveTimesheetInput,
  WeeklyTimesheetRecord,
} from "@/services/consultant-service";

type ActionResult =
  | { ok: true; message: string; timesheetId?: string }
  | { ok: false; error: string };

type LoadTimesheetResult =
  | { ok: true; timesheet: WeeklyTimesheetRecord }
  | { ok: false; error: string };

type CreateTimesheetResult =
  | { ok: true; timesheetId: string }
  | { ok: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
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
    revalidatePath("/consultant");
    return { ok: true, message: "Draft saved", timesheetId: result.timesheetId };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function submitConsultantTimesheetAction(
  input: SaveTimesheetInput,
): Promise<ActionResult> {
  try {
    const result = await consultantService.submitWeeklyTimesheet(input);
    revalidatePath("/consultant");
    return { ok: true, message: "Timesheet submitted", timesheetId: result.timesheetId };
  } catch (error) {
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
    revalidatePath("/consultant");
    return { ok: true, message: "Draft timesheet deleted" };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
