import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarClock, FileText, Send, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { consultantService } from "@/services";
import { formatConsultantTimesheetStatusLabel, getConsultantTimesheetDisplayStatus } from "@/lib/consultant-timesheet-status";
import { CreateTimesheetButton } from "./create-timesheet-button";
import { DeleteDraftButton } from "./delete-draft-button";
import { MonthFilterForm } from "./month-filter-form";

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMonthLabel(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCurrentIsoMonth(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function truncateTimesheetId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function getStatusBadgeClassName(status: string): string {
  if (status === "approved" || status === "approved_late") {
    return "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "processed") {
    return "border-sky-600/30 bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (status === "submitted" || status === "submitted_late") {
    return "border-blue-600/30 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (status === "rejected") {
    return "border-rose-600/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }
  if (status === "overdue") {
    return "border-red-600/30 bg-red-500/15 text-red-700 dark:text-red-300";
  }
  return "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function normalizeMonthValue(month?: string): string {
  if (!month) return "";
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
}

type ConsultantPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default function ConsultantPage({
  searchParams,
}: ConsultantPageProps) {
  return (
    <Suspense fallback={<ConsultantPageSkeleton />}>
      <ConsultantPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConsultantPageContent({
  searchParams,
}: ConsultantPageProps) {
  await connection();

  try {
    const params = await searchParams;
    const timesheets = await consultantService.listTimesheets();
    const selectedMonth = normalizeMonthValue(params.month);
    const statsMonth = selectedMonth || getCurrentIsoMonth();

    const filteredTimesheets = selectedMonth
      ? timesheets.filter((timesheet) => timesheet.weekStart.slice(0, 7) === selectedMonth)
      : timesheets;
    const statsTimesheets = timesheets.filter(
      (timesheet) => timesheet.weekStart.slice(0, 7) === statsMonth,
    );
    const monthHoursWorked = statsTimesheets.reduce(
      (total, timesheet) => total + timesheet.totalHours,
      0,
    );
    const waitingForApprovalCount = statsTimesheets.filter(
      (timesheet) =>
        timesheet.status === "submitted" ||
        timesheet.status === "submitted_late",
    ).length;
    const draftCount = statsTimesheets.filter((timesheet) => {
      const displayStatus = getConsultantTimesheetDisplayStatus(
        timesheet.status,
        timesheet.weekStart,
      );
      return displayStatus === "draft" || displayStatus === "overdue";
    }).length;
    const groupedTimesheets = Object.entries(
      filteredTimesheets.reduce<Record<string, typeof filteredTimesheets>>((groups, timesheet) => {
        const monthKey = timesheet.weekStart.slice(0, 7);
        groups[monthKey] ??= [];
        groups[monthKey].push(timesheet);
        return groups;
      }, {}),
    ).sort(([monthA], [monthB]) => monthB.localeCompare(monthA));
    const availableMonths = Array.from(
      new Set(timesheets.map((timesheet) => timesheet.weekStart.slice(0, 7))),
    ).sort((a, b) => b.localeCompare(a));

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:h-full md:overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">My Timesheets</h1>
            <CreateTimesheetButton />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <p className="text-sm font-medium">{formatMonthLabel(statsMonth)} Snapshot</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                    <Timer className="h-4 w-4" />
                    <p className="text-xs font-medium">Hours worked</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-sky-800 dark:text-sky-200">
                    {monthHoursWorked.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <FileText className="h-4 w-4" />
                    <p className="text-xs font-medium">Timesheets</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-violet-800 dark:text-violet-200">
                    {statsTimesheets.length}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Send className="h-4 w-4" />
                    <p className="text-xs font-medium">Waiting for approval</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-blue-800 dark:text-blue-200">
                    {waitingForApprovalCount}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <CalendarClock className="h-4 w-4" />
                    <p className="text-xs font-medium">Draft / Overdue</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-amber-800 dark:text-amber-200">
                    {draftCount}
                  </p>
                </div>
              </div>
            </div>

            <MonthFilterForm
              selectedMonth={selectedMonth}
              availableMonths={availableMonths.map((month) => ({
                value: month,
                label: formatMonthLabel(month),
              }))}
            />

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <div className="h-full overflow-x-auto">
                <Table className="min-w-[760px]">
                <TableHeader className="sticky top-0 z-20 bg-card">
                  <TableRow>
                    <TableHead className="bg-card">Timesheet ID</TableHead>
                    <TableHead className="bg-card">Week</TableHead>
                    <TableHead className="bg-card">Project Code</TableHead>
                    <TableHead className="bg-card">Status</TableHead>
                    <TableHead className="bg-card">Total Hours</TableHead>
                    <TableHead className="bg-card">Last Updated</TableHead>
                    <TableHead className="bg-card text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                        No timesheets found for this month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedTimesheets.flatMap(([monthKey, monthTimesheets]) => [
                      <TableRow key={`month-${monthKey}`} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={7} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatMonthLabel(monthKey)}
                        </TableCell>
                      </TableRow>,
                      ...monthTimesheets.map((timesheet) => {
                        const displayStatus = getConsultantTimesheetDisplayStatus(
                          timesheet.status,
                          timesheet.weekStart,
                        );

                        return (
                          <TableRow key={timesheet.id}>
                            <TableCell className="font-mono text-xs" title={timesheet.id}>
                              {truncateTimesheetId(timesheet.id)}
                            </TableCell>
                            <TableCell>
                              {formatDate(timesheet.weekStart)} to {formatDate(timesheet.weekEnd)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {timesheet.projectCode || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStatusBadgeClassName(displayStatus)}>
                                {formatConsultantTimesheetStatusLabel(timesheet.status, timesheet.weekStart)}
                              </Badge>
                            </TableCell>
                            <TableCell>{timesheet.totalHours.toFixed(2)}</TableCell>
                            <TableCell>{formatDateTime(timesheet.updatedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/consultant/timesheets/${timesheet.id}`}>
                                    {timesheet.status === "draft" ? "Continue" : "View"}
                                  </Link>
                                </Button>
                                {timesheet.status === "draft" ? (
                                  <DeleteDraftButton timesheetId={timesheet.id} />
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    ])
                  )}
                </TableBody>
                </Table>
              </div>
            </div>
          </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheets";

    return (
      <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">My Timesheets</h1>
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
      </div>
    );
  }
}

function ConsultantPageSkeleton() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">My Timesheets</h1>
      <div className="h-9 w-[180px] rounded-md bg-muted" />
        <div className="h-48 rounded-md border bg-muted/30" />
    </div>
  );
}
