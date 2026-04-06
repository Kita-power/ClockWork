export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { ManagerDashboardClient } from "../manager-dashboard-client";
import { managerService } from "@/services/manager-service";

export default async function ManagerTimesheetsContent() {
  const [initialTimesheets, initialLeaveRequests] = await Promise.all([
    managerService.listTimesheets(),
    managerService.listLeaveRequests(),
  ]);

  return (
    <ManagerDashboardClient
      initialTimesheets={initialTimesheets}
      initialLeaveRequests={initialLeaveRequests}
    />
  );
}