import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { consultantService } from "@/services";
import { ConsultantTimesheetClient } from "../consultant-timesheet-client";

type ConsultantNewTimesheetContentProps = {
  searchParams: Promise<{
    create?: string;
    timesheetId?: string;
    weekStart?: string;
    t?: string;
  }>;
};

export default function ConsultantNewTimesheetPage({
  searchParams,
}: ConsultantNewTimesheetContentProps) {
  return (
    <Suspense fallback={<ConsultantNewTimesheetFallback />}>
      <ConsultantNewTimesheetContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConsultantNewTimesheetContent({
  searchParams,
}: ConsultantNewTimesheetContentProps) {
  try {
    await connection();
    const params = await searchParams;
    const shouldCreate = params.create === "1";

    if (shouldCreate) {
      const created = await consultantService.createNewWeeklyTimesheet();
      redirect(`/consultant/new?timesheetId=${created.id}`);
    }

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
        key={timesheet.id}
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

    return (
      <Card>
        <CardHeader>
          <CardTitle>New Weekly Timesheet</CardTitle>
          <CardDescription>
            We could not load your draft timesheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
          <Button asChild variant="outline">
            <Link href="/consultant">Back to My Timesheets</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
}

function ConsultantNewTimesheetFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Weekly Timesheet</CardTitle>
        <CardDescription>Loading timesheet...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 rounded-md border bg-muted/30" />
      </CardContent>
    </Card>
  );
}
