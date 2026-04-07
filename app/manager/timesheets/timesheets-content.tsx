export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { ManagerDashboardClient } from "../manager-dashboard-client";
import { managerService } from "@/services/manager-service";

export default async function ManagerTimesheetsContent() {
  const initialTimesheets = await managerService.listTimesheets();

  return <ManagerDashboardClient initialTimesheets={initialTimesheets} />;
}