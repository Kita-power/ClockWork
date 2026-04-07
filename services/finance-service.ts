import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FinanceTimesheetRecord = {
  id: string;
  consultant_id: string;
  consultant_name: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  processed_at: string | null;
  being_processed_by: string | null;
  being_processed_at: string | null;
  export_completed: boolean;
};

type DbTimesheetRow = {
  id: string;
  consultant_id: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_hours: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  processed_at: string | null;
  being_processed_by: string | null;
  being_processed_at: string | null;
  export_completed: boolean | null;
};

type DbUserRow = {
  id: string;
  full_name: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export const financeService = {
  async listApprovedTimesheets(): Promise<FinanceTimesheetRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timesheets")
      .select(
        "id, consultant_id, week_start_date, week_end_date, status, total_hours, submitted_at, approved_at, processed_at, being_processed_by, being_processed_at, export_completed",
      )
      .eq("status", "approved")
      .order("week_start_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as DbTimesheetRow[];
    const consultantIds = Array.from(new Set(rows.map((row) => row.consultant_id)));

    let consultantNameById = new Map<string, string>();
    if (consultantIds.length > 0) {
      const { data: userRows, error: usersError } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", consultantIds);

      if (usersError) throw new Error(usersError.message);

      consultantNameById = new Map(
        ((userRows ?? []) as DbUserRow[]).map((user) => [user.id, user.full_name ?? "Unknown"]),
      );
    }

    return rows.map((row) => ({
      id: row.id,
      consultant_id: row.consultant_id,
      consultant_name: consultantNameById.get(row.consultant_id) ?? "Unknown",
      week_start_date: row.week_start_date,
      week_end_date: row.week_end_date,
      status: row.status,
      total_hours: toNumber(row.total_hours),
      submitted_at: row.submitted_at,
      approved_at: row.approved_at,
      processed_at: row.processed_at,
      being_processed_by: row.being_processed_by,
      being_processed_at: row.being_processed_at,
      export_completed: Boolean(row.export_completed),
    }));
  },

  async markAsBeingProcessed(
    timesheetId: string,
    financeUserId: string
  ): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("timesheets")
      .update({
        being_processed_by: financeUserId,
        being_processed_at: now,
        updated_at: now,
      })
      .eq("id", timesheetId);

    if (error) throw new Error(error.message);
  },

  async markAsProcessed(timesheetId: string): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("timesheets")
      .update({ status: "processed", processed_at: now, updated_at: now })
      .eq("id", timesheetId);

    if (error) throw new Error(error.message);
  },
};