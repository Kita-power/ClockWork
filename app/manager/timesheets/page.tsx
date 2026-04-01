import { ManagerDashboardClient } from "../manager-dashboard-client";
import {
  managerMockLeaveRequests,
  managerMockTimesheets,
} from "../mock-data";

export default function ManagerTimesheetsPage() {
  return (
    <ManagerDashboardClient
      initialTimesheets={managerMockTimesheets}
      initialLeaveRequests={managerMockLeaveRequests}
    />
  );
}