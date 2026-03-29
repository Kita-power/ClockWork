import { consultantService } from "@/services";
import { ConsultantTimesheetClient } from "../consultant-timesheet-client";

type ConsultantNewTimesheetPageProps = {
  searchParams: Promise<{
    weekStart?: string;
  }>;
};

export default async function ConsultantNewTimesheetPage({
  searchParams,
}: ConsultantNewTimesheetPageProps) {
  try {
    const params = await searchParams;
    const timesheet = await consultantService.getWeeklyTimesheet(params.weekStart);

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
