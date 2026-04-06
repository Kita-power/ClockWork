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
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  if (v === "submitted_late") return "Submitted Late";
  if (v === "submitted") return "Submitted";


  
  return "Submitted";
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
      return v === "submitted" || v === "approved" || v === "rejected" || v === "processed" || v === "submitted_late";
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

  async approveTimesheet(timesheetId: string): Promise<void> {
    const managerId = await getAuthenticatedManagerId();
    if (!managerId) throw new Error("Not authenticated.");

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("timesheets")
      .update({ status: "approved", approved_at: now, updated_at: now })
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