import { managerService } from "@/services";
import { ManagerDashboardClient } from "../manager-dashboard-client";
import { managerMockTimesheets } from "../mock-data";

export default function ManagerTimesheetsPage() {
  return (
    <ManagerDashboardClient
      initialTimesheets={managerMockTimesheets}
    />
  );
}