"use server";

import { revalidatePath } from "next/cache";
import { managerService } from "@/services/manager-service";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function approveTimesheetAction(input: {
  timesheetId: string;
}): Promise<ActionResult> {
  try {
    if (!input.timesheetId.trim()) {
      return { ok: false, error: "Timesheet ID is required." };
    }

    await managerService.approveTimesheet(input.timesheetId);
    await logAuditSuccess({
      action: "manager.timesheet.approve",
      entityType: "timesheet",
      entityId: input.timesheetId,
    });

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "manager.timesheet.approve",
      entityType: "timesheet",
      entityId: input.timesheetId,
      error: e,
    });
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
    await logAuditSuccess({
      action: "manager.timesheet.reject",
      entityType: "timesheet",
      entityId: input.timesheetId,
      metadata: { commentLength: input.comment.trim().length },
    });

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "manager.timesheet.reject",
      entityType: "timesheet",
      entityId: input.timesheetId,
      metadata: { commentLength: input.comment?.trim().length ?? 0 },
      error: e,
    });
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
    await logAuditSuccess({
      action: "manager.leave_request.approve",
      entityType: "leave_request",
      entityId: input.leaveRequestId,
    });

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "manager.leave_request.approve",
      entityType: "leave_request",
      entityId: input.leaveRequestId,
      error: e,
    });
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
    await logAuditSuccess({
      action: "manager.leave_request.reject",
      entityType: "leave_request",
      entityId: input.leaveRequestId,
      metadata: { commentLength: input.comment.trim().length },
    });

    revalidatePath("/manager");
    revalidatePath("/manager/timesheets");
    revalidatePath("/admin/audit-logs");

    return { ok: true };
  } catch (e) {
    await logAuditFailure({
      action: "manager.leave_request.reject",
      entityType: "leave_request",
      entityId: input.leaveRequestId,
      metadata: { commentLength: input.comment?.trim().length ?? 0 },
      error: e,
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to reject leave request",
    };
  }
}