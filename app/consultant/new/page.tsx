import { connection } from "next/server";
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

  try {
    const params = await searchParams;
    const shouldCreate = params.create === "1";

    const timesheet = shouldCreate
      ? await consultantService.createNewWeeklyTimesheet()
      : params.timesheetId
        ? await consultantService.getWeeklyTimesheetById(params.timesheetId)
      : params.weekStart
        ? await consultantService.getWeeklyTimesheet(params.weekStart)
        : await consultantService.createNewWeeklyTimesheet();

    return (
      <ConsultantTimesheetClient
        initialTimesheet={timesheet}
        initialError={null}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheet";

    const fallback = await consultantService.getWeeklyTimesheet();
    return (
      <ConsultantTimesheetClient
        initialTimesheet={fallback}
        initialError={message}
      />
    );
  }
}
