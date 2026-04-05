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
    const [timesheet, assignedProjects] = await Promise.all([
      consultantService.getWeeklyTimesheetById(routeParams.timesheetId),
      consultantService.listAssignedProjectsForCurrentConsultant(),
    ]);

    return (
      <ConsultantTimesheetClient
        key={timesheet.id}
        initialTimesheet={timesheet}
        assignedProjects={assignedProjects}
        initialError={null}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheet";

    if (message === "Timesheet not found") {
      notFound();
    }

    const [fallback, assignedProjects] = await Promise.all([
      consultantService.getWeeklyTimesheet(),
      consultantService.listAssignedProjectsForCurrentConsultant(),
    ]);
    return (
      <ConsultantTimesheetClient
        key={fallback.id}
        initialTimesheet={fallback}
        assignedProjects={assignedProjects}
        initialError={message}
      />
    );
  }
}
