"use server";

import { revalidatePath } from "next/cache";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function approveTimesheetAction(input: {
  timesheetId: string;
}): Promise<ActionResult> {
  try {
    // TODO: Replace with Supabase update:
    // - verify user is a manager
    // - update timesheet.status = "Approved" (or "Approved Late")
    // - set approved_at timestamp
    // - notify consultant + finance (later)
    revalidatePath("/manager");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unable to approve timesheet" };
  }
}

export async function rejectTimesheetAction(input: {
  timesheetId: string;
  comment: string;
}): Promise<ActionResult> {
  try {
    if (!input.comment.trim()) {
      return { ok: false, error: "Comment is required." };
    }

    // TODO: Replace with Supabase update:
    // - timesheet.status = "Rejected"
    // - timesheet.rejection_comment = comment
    // - set rejected_at timestamp
    // - notify consultant (later)
    revalidatePath("/manager");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unable to reject timesheet" };
  }
}