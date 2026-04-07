import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TimesheetEntry = {
  dayLabel: string;
  date: string;
  hours: number;
  description: string;
};

export type ManagerTimesheetSummary = {
  id: string;
  consultantName: string;
  projectCode: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status:
    | "Submitted"
    | "Submitted Late"
    | "Approved"
    | "Approved Late"
    | "Rejected"
    | "Processed"
  submittedAt: string;
  entries?: TimesheetEntry[];
  managerComment?: string;
};

export type ManagerLeaveRequestSummary = {
  id: string;
  consultantName: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Other";
  startDate: string;
  endDate: string;
  durationDays: number;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  managerComment?: string;
};

type DbUserRow = { id: string; full_name: string; manager_id: string | null };

type DbTimesheetRow = {
  id: string;
  consultant_id: string;
  project_id: string | null;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_hours: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DbProjectRow = { id: string; code: string };

type DbTimeEntryRow = {
  entry_date: string;
  hours: number | string | null;
  notes: string | null;
};

type DbTimesheetCommentRow = {
  body: string;
  created_at: string | null;
};

type DbLeaveRequestRow = {
  id: string;
  consultant_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_hours: number | string | null;
  status: string;
  rejection_comment: string | null;
  created_at: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeLeaveType(value: string): ManagerLeaveRequestSummary["leaveType"] {
  const v = value.trim().toLowerCase();
  if (v.includes("annual")) return "Annual Leave";
  if (v.includes("sick")) return "Sick Leave";
  if (v.includes("unpaid")) return "Unpaid Leave";
  return "Other";
}

function mapLeaveStatus(value: string): ManagerLeaveRequestSummary["status"] {
  const v = value.trim().toLowerCase();
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  
  return "Pending";
}


function mapTimesheetStatus(row: DbTimesheetRow): ManagerTimesheetSummary["status"] {
  const v = String(row.status ?? "").trim().toLowerCase();

  
  if (row.processed_at || v === "processed") return "Processed";
  if (v === "approved_late") return "Approved Late";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  if (v === "submitted_late") return "Submitted Late";
  if (v === "submitted") return "Submitted";


  
  return "Submitted";
}

function parseEntryDescription(notes: string | null): string {
  if (!notes) return "";

  try {
    const parsed = JSON.parse(notes) as {
      text?: unknown;
      tasks?: Array<{ title?: unknown }>;
    };

    const text = typeof parsed?.text === "string" ? parsed.text.trim() : "";
    const taskTitles = Array.isArray(parsed?.tasks)
      ? parsed.tasks
          .map((task) => (typeof task?.title === "string" ? task.title.trim() : ""))
          .filter((title) => title.length > 0)
      : [];

    if (text.length > 0 && taskTitles.length > 0) {
      return `${text}\nTasks: ${taskTitles.join(", ")}`;
    }

    if (text.length > 0) {
      return text;
    }

    if (taskTitles.length > 0) {
      return `Tasks: ${taskTitles.join(", ")}`;
    }
  } catch {
    // fall through to plain-text note
  }

  return notes;
}

async function getAuthenticatedManagerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

async function listTeamConsultants(managerId: string): Promise<DbUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, manager_id")
    .eq("manager_id", managerId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbUserRow[];
}

async function assertTimesheetBelongsToManager(
  managerId: string,
  consultantId: string,
): Promise<void> {
  const consultants = await listTeamConsultants(managerId);
  const managedConsultantIds = new Set(consultants.map((consultant) => consultant.id));

  if (!managedConsultantIds.has(consultantId)) {
    throw new Error("Timesheet not found");
  }
}

async function projectCodeById(projectIds: string[]): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("id, code").in("id", projectIds);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbProjectRow[];
  return new Map(rows.map((r) => [r.id, r.code]));
}

export const managerService = {
  description: "Manager workflows (direct Supabase queries).",

  async listTimesheets(): Promise<ManagerTimesheetSummary[]> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) return [];

    const consultants = await listTeamConsultants(managerId);
    const consultantIds = consultants.map((c) => c.id);
    const consultantNameById = new Map(consultants.map((c) => [c.id, c.full_name]));

    if (consultantIds.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("timesheets")
      .select(
        "id, consultant_id, project_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, created_at, updated_at",
      )
      .in("consultant_id", consultantIds)
      .order("week_start_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as DbTimesheetRow[];

    
    const managerVisibleRows = rows.filter((row) => {
      const v = String(row.status ?? "").trim().toLowerCase();
      return (
        v === "submitted" ||
        v === "submitted_late" ||
        v === "approved" ||
        v === "approved_late" ||
        v === "rejected" ||
        v === "processed"
      );
    });

    const projectIds = Array.from(
      new Set(managerVisibleRows.map((r) => r.project_id).filter((v): v is string => Boolean(v))),
    );
    const codeByProjectId = await projectCodeById(projectIds);

    return managerVisibleRows.map((row) => ({
      id: row.id,
      consultantName: consultantNameById.get(row.consultant_id) ?? "Unknown",
      projectCode: row.project_id ? codeByProjectId.get(row.project_id) ?? "" : "",
      weekStart: row.week_start_date,
      weekEnd: row.week_end_date,
      totalHours: toNumber(row.total_hours),
      status: mapTimesheetStatus(row),
      submittedAt: row.submitted_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
    }));
  },

  async getTimesheetById(timesheetId: string): Promise<ManagerTimesheetSummary> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) {
      throw new Error("Timesheet not found");
    }

    const supabase = await createClient();
    const { data: timesheetRow, error: timesheetError } = await supabase
      .from("timesheets")
      .select(
        "id, consultant_id, project_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, created_at, updated_at",
      )
      .eq("id", timesheetId)
      .maybeSingle();

    if (timesheetError) throw new Error(timesheetError.message);
    if (!timesheetRow) throw new Error("Timesheet not found");

    const typedRow = timesheetRow as DbTimesheetRow;
    await assertTimesheetBelongsToManager(managerId, typedRow.consultant_id);

    const [{ data: consultantRow, error: consultantError }, codeByProjectId, entriesQuery, commentsQuery] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, full_name")
          .eq("id", typedRow.consultant_id)
          .maybeSingle(),
        projectCodeById(typedRow.project_id ? [typedRow.project_id] : []),
        supabase
          .from("time_entries")
          .select("entry_date, hours, notes")
          .eq("timesheet_id", typedRow.id)
          .order("entry_date", { ascending: true }),
        supabase
          .from("timesheet_comments")
          .select("body, created_at")
          .eq("timesheet_id", typedRow.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    if (consultantError) throw new Error(consultantError.message);
    if (entriesQuery.error) throw new Error(entriesQuery.error.message);
    if (commentsQuery.error) throw new Error(commentsQuery.error.message);

    const rawEntries = (entriesQuery.data ?? []) as DbTimeEntryRow[];
    const entries: TimesheetEntry[] = rawEntries.map((entry) => ({
      dayLabel: new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      date: entry.entry_date,
      hours: toNumber(entry.hours),
      description: parseEntryDescription(entry.notes),
    }));

    const latestComment = ((commentsQuery.data ?? []) as DbTimesheetCommentRow[])[0];

    return {
      id: typedRow.id,
      consultantName: (consultantRow as { id: string; full_name: string } | null)?.full_name ?? "Unknown",
      projectCode: typedRow.project_id ? codeByProjectId.get(typedRow.project_id) ?? "" : "",
      weekStart: typedRow.week_start_date,
      weekEnd: typedRow.week_end_date,
      totalHours: toNumber(typedRow.total_hours),
      status: mapTimesheetStatus(typedRow),
      submittedAt:
        typedRow.submitted_at ?? typedRow.updated_at ?? typedRow.created_at ?? new Date().toISOString(),
      entries,
      managerComment: latestComment?.body ?? undefined,
    };
  },

  async approveTimesheet(timesheetId: string): Promise<void> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) throw new Error("Not authenticated.");

    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data: timesheetRow, error: timesheetError } = await supabase
      .from("timesheets")
      .select("consultant_id, status")
      .eq("id", timesheetId)
      .maybeSingle();

    if (timesheetError) throw new Error(timesheetError.message);
    if (!timesheetRow) throw new Error("Timesheet not found");

    await assertTimesheetBelongsToManager(
      managerId,
      (timesheetRow as { consultant_id: string }).consultant_id,
    );

    const currentStatus = String((timesheetRow as { status: string | null }).status ?? "")
      .trim()
      .toLowerCase();
    const nextStatus = currentStatus === "submitted_late" ? "approved_late" : "approved";

    const { error } = await supabase
      .from("timesheets")
      .update({ status: nextStatus, approved_at: now, updated_at: now })
      .eq("id", timesheetId);

    if (error) throw new Error(error.message);
  },

  async rejectTimesheet(timesheetId: string, comment: string): Promise<void> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) throw new Error("Not authenticated.");

    if (!comment.trim()) throw new Error("Comment is required.");

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("timesheets")
      .update({ status: "rejected", updated_at: now })
      .eq("id", timesheetId);

    if (updateError) throw new Error(updateError.message);

    const { error: commentError } = await supabase.from("timesheet_comments").insert({
      timesheet_id: timesheetId,
      author_id: managerId,
      body: comment.trim(),
      created_at: now,
    });

    if (commentError) throw new Error(commentError.message);
  },

  async listLeaveRequests(): Promise<ManagerLeaveRequestSummary[]> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) return [];

    const consultants = await listTeamConsultants(managerId);
    const consultantIds = consultants.map((c) => c.id);
    const consultantNameById = new Map(consultants.map((c) => [c.id, c.full_name]));

    if (consultantIds.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        "id, consultant_id, leave_type, start_date, end_date, duration_hours, status, rejection_comment, created_at",
      )
      .in("consultant_id", consultantIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as DbLeaveRequestRow[]).map((row) => ({
      id: row.id,
      consultantName: consultantNameById.get(row.consultant_id) ?? "Unknown",
      leaveType: normalizeLeaveType(row.leave_type ?? "Other"),
      startDate: row.start_date,
      endDate: row.end_date,
      durationDays: toNumber(row.duration_hours) / 8,
      status: mapLeaveStatus(row.status ?? "pending"),
      submittedAt: row.created_at ?? new Date().toISOString(),
      managerComment: row.rejection_comment ?? undefined,
    }));
  },

  async approveLeaveRequest(leaveRequestId: string): Promise<void> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) throw new Error("Not authenticated.");

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "approved", rejection_comment: null, updated_at: now })
      .eq("id", leaveRequestId);

    if (error) throw new Error(error.message);
  },

  async rejectLeaveRequest(leaveRequestId: string, comment: string): Promise<void> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) throw new Error("Not authenticated.");

    if (!comment.trim()) throw new Error("Comment is required.");

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "rejected", rejection_comment: comment.trim(), updated_at: now })
      .eq("id", leaveRequestId);

    if (error) throw new Error(error.message);
  },
};