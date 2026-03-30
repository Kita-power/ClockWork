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
    redirect(`/consultant/timesheets/${created.id}`);
  }

  try {
    const timesheet = params.timesheetId
      ? await consultantService.getWeeklyTimesheetById(params.timesheetId)
      : params.weekStart
      ? await consultantService.getWeeklyTimesheet(params.weekStart)
      : await consultantService.getWeeklyTimesheet();

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
