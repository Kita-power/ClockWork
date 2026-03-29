import { connection } from "next/server";
import { consultantService } from "@/services";
import { ConsultantTimesheetClient } from "../../consultant-timesheet-client";

type ConsultantTimesheetDetailPageProps = {
  params: Promise<{
    timesheetId: string;
  }>;
};

export default async function ConsultantTimesheetDetailPage({
  params,
}: ConsultantTimesheetDetailPageProps) {
  await connection();

  try {
    const routeParams = await params;
    const timesheet = await consultantService.getWeeklyTimesheetById(
      routeParams.timesheetId,
    );

    return (
      <ConsultantTimesheetClient
        initialTimesheet={timesheet}
        initialError={null}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheet";

    const fallback = await consultantService.createNewWeeklyTimesheet();
    return (
      <ConsultantTimesheetClient
        initialTimesheet={fallback}
        initialError={message}
      />
    );
  }
}
