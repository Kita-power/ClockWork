import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function ConsultantPage() {
  try {
    const timesheets = await consultantService.listTimesheets();

    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>My Timesheets</CardTitle>
            <CardDescription>
              Review previous submissions and continue drafts before creating a new weekly timesheet.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/consultant/new">Create Timesheet</Link>
          </Button>
        </CardHeader>

        <CardContent>
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
              {timesheets.map((timesheet) => (
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
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/consultant/new?weekStart=${timesheet.weekStart}`}>
                        {timesheet.status === "submitted" ? "View" : "Continue"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
