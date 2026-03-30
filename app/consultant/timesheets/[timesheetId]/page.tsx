import { connection } from "next/server";
import { notFound } from "next/navigation";
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

    if (message === "Timesheet not found") {
      notFound();
    }

    const fallback = await consultantService.getWeeklyTimesheet();
    return <ConsultantTimesheetClient initialTimesheet={fallback} initialError={message} />;
  }
}
