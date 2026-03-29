import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { consultantService } from "@/services";
import { CreateTimesheetButton } from "./create-timesheet-button";
import { DeleteDraftButton } from "./delete-draft-button";

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

function normalizeMonthValue(month?: string): string {
  if (!month) return "";
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
}

type ConsultantPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function ConsultantPage({
  searchParams,
}: ConsultantPageProps) {
  await connection();

  try {
    const params = await searchParams;
    const timesheets = await consultantService.listTimesheets();
    const selectedMonth = normalizeMonthValue(params.month);

    const filteredTimesheets = selectedMonth
      ? timesheets.filter((timesheet) => timesheet.weekStart.slice(0, 7) === selectedMonth)
      : timesheets;

    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>My Timesheets</CardTitle>
            <CardDescription>
              Review previous submissions and continue drafts before creating a new weekly timesheet.
            </CardDescription>
          </div>
          <CreateTimesheetButton />
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-2" method="get">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="month-filter">
                Filter by month
              </label>
              <Input
                id="month-filter"
                name="month"
                type="month"
                defaultValue={selectedMonth}
                className="w-[180px]"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
            {selectedMonth ? (
              <Button asChild type="button" variant="ghost" size="sm">
                <Link href="/consultant">Clear</Link>
              </Button>
            ) : null}
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No timesheets found for this month.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      {formatDate(timesheet.weekStart)} to {formatDate(timesheet.weekEnd)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={timesheet.status === "submitted" ? "secondary" : "outline"}>
                        {timesheet.status === "submitted" ? "Submitted" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{timesheet.totalHours.toFixed(2)}</TableCell>
                    <TableCell>{formatDateTime(timesheet.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/consultant/timesheets/${timesheet.id}`}>
                            {timesheet.status === "submitted" ? "View" : "Continue"}
                          </Link>
                        </Button>
                        {timesheet.status === "draft" ? (
                          <DeleteDraftButton timesheetId={timesheet.id} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load timesheets";

    return (
      <Card>
        <CardHeader>
          <CardTitle>My Timesheets</CardTitle>
          <CardDescription>
            There was a problem loading your timesheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        </CardContent>
      </Card>
    );
  }
}
