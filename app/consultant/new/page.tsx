import { connection } from "next/server";
import { redirect } from "next/navigation";
import { consultantService } from "@/services";
import { ConsultantTimesheetClient } from "../consultant-timesheet-client";

type ConsultantNewTimesheetPageProps = {
  searchParams: Promise<{
    create?: string;
    timesheetId?: string;
    weekStart?: string;
    t?: string;
  }>;
};

export default async function ConsultantNewTimesheetPage({
  searchParams,
}: ConsultantNewTimesheetPageProps) {
  await connection();
  const params = await searchParams;
  const shouldCreate = params.create === "1";

  if (shouldCreate) {
    const created = await consultantService.createNewWeeklyTimesheet();
    redirect(`/consultant/new?timesheetId=${created.id}`);
  }

  try {
    const [timesheet, assignedProjects] = await Promise.all([
      params.timesheetId
        ? consultantService.getWeeklyTimesheetById(params.timesheetId)
        : params.weekStart
        ? consultantService.getWeeklyDraftTimesheet(params.weekStart)
        : consultantService.createNewWeeklyTimesheet(),
      consultantService.listAssignedProjectsForCurrentConsultant(),
    ]);

    return (
      <ConsultantTimesheetClient
        initialTimesheet={timesheet}
        assignedProjects={assignedProjects}
        initialError={null}
        loadSubmittedOnWeekChange={false}
        useNewRouteForDrafts={true}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheet";

    const [fallback, assignedProjects] = await Promise.all([
      consultantService.createNewWeeklyTimesheet(),
      consultantService.listAssignedProjectsForCurrentConsultant(),
    ]);
    return (
      <ConsultantTimesheetClient
        initialTimesheet={fallback}
        assignedProjects={assignedProjects}
        initialError={message}
        loadSubmittedOnWeekChange={false}
        useNewRouteForDrafts={true}
      />
    );
  }
}
