"use server";

import { revalidatePath } from "next/cache";
import { managerService } from "@/services/manager-service";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function approveTimesheetAction(input: {
  timesheetId: string;
}): Promise<ActionResult> {
  try {
    if (!input.timesheetId.trim()) {
      return { ok: false, error: "Timesheet ID is required." };
    }

    await managerService.approveTimesheet(input.timesheetId);

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to approve timesheet",
    };
  }
}

export async function rejectTimesheetAction(input: {
  timesheetId: string;
  comment: string;
}): Promise<ActionResult> {
  try {
    if (!input.timesheetId.trim()) {
      return { ok: false, error: "Timesheet ID is required." };
    }

    if (!input.comment.trim()) {
      return { ok: false, error: "Comment is required." };
    }

    await managerService.rejectTimesheet(input.timesheetId, input.comment);

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to reject timesheet",
    };
  }
}

export async function approveLeaveRequestAction(input: {
  leaveRequestId: string;
}): Promise<ActionResult> {
  try {
    if (!input.leaveRequestId.trim()) {
      return { ok: false, error: "Leave request ID is required." };
    }

    await managerService.approveLeaveRequest(input.leaveRequestId);

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to approve leave request",
    };
  }
}

export async function rejectLeaveRequestAction(input: {
  leaveRequestId: string;
  comment: string;
}): Promise<ActionResult> {
  try {
    if (!input.leaveRequestId.trim()) {
      return { ok: false, error: "Leave request ID is required." };
    }

    if (!input.comment.trim()) {
      return { ok: false, error: "Comment is required." };
    }

    await managerService.rejectLeaveRequest(input.leaveRequestId, input.comment);

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to reject leave request",
    };
  }
}