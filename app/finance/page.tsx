import { financeService } from "@/services";
import { FinanceTimesheetsClient } from "./timesheets-client";

export default async function FinancePage() {
  try {
    const timesheets = await financeService.listApprovedTimesheets();
    return <FinanceTimesheetsClient timesheets={timesheets} initialError={null} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load timesheets";
    return <FinanceTimesheetsClient timesheets={[]} initialError={message} />;
  }
}