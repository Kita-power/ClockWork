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

export const financeService = {
  async listApprovedTimesheets(): Promise<FinanceTimesheetRecord[]> {
    const supabase = await createClient();
    
    // TODO: Implement RPC call
    // const { data, error } = await supabase.rpc("finance_list_approved_timesheets");
    // if (error) throw new Error(error.message);
    // return data ?? [];
    
    return [
  {
    id: "1",
    consultant_id: "c1",
    consultant_name: "Turki",
    week_start_date: "2026-03-31",
    week_end_date: "2026-04-06",
    status: "approved",
    total_hours: 40,
    submitted_at: "2026-04-05T10:00:00Z",
    approved_at: "2026-04-05T15:00:00Z",
    processed_at: null,
    being_processed_by: null,
    being_processed_at: null,
    export_completed: false,
  },
  {
    id: "2",
    consultant_id: "c2",
    consultant_name: "Mashhour",
    week_start_date: "2026-03-31",
    week_end_date: "2026-04-06",
    status: "approved",
    total_hours: 38,
    submitted_at: "2026-04-04T09:00:00Z",
    approved_at: "2026-04-05T14:00:00Z",
    processed_at: null,
    being_processed_by: null,
    being_processed_at: null,
    export_completed: false,
  },
];
  },

  async markAsBeingProcessed(
    timesheetId: string,
    financeUserId: string
  ): Promise<void> {
    const supabase = await createClient();
    
    // TODO: Implement RPC call
    // const { error } = await supabase.rpc("finance_mark_being_processed", {
    //   p_timesheet_id: timesheetId,
    //   p_finance_user_id: financeUserId,
    // });
    // if (error) throw new Error(error.message);
  },

  async markAsProcessed(timesheetId: string): Promise<void> {
    const supabase = await createClient();
    
    // TODO: Implement RPC call
    // const { error } = await supabase.rpc("finance_mark_processed", {
    //   p_timesheet_id: timesheetId,
    // });
    // if (error) throw new Error(error.message);
  },
};