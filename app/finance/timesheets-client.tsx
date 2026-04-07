"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FinanceTimesheetRecord } from "@/services/finance-service";

function toUiStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function FinanceTimesheetsClient({
  timesheets,
  initialError,
}: {
  timesheets: FinanceTimesheetRecord[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const filteredTimesheets = timesheets.filter((timesheet) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      !normalizedQuery ||
      timesheet.consultant_name.toLowerCase().includes(normalizedQuery) ||
      timesheet.week_start_date.includes(normalizedQuery)
    );
  });

  const selectedTimesheet = timesheets.find((ts) => ts.id === selectedTimesheetId) ?? null;

  const handleMarkAsProcessed = async (timesheetId: string) => {
    // TODO: Call financeService.markAsProcessed(timesheetId)
    console.log("Mark as processed:", timesheetId);
    alert("This will mark timesheet as processed (to be implemented)");
  };

  const handleExport = () => {
    const headers = ["Consultant", "Week Start", "Week End", "Total Hours", "Status"];
    const rows = filteredTimesheets.map((ts) => [
      ts.consultant_name,
      ts.week_start_date,
      ts.week_end_date,
      ts.total_hours.toString(),
      ts.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timesheets_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Approved Timesheets</CardTitle>
            <CardDescription>
              Process approved timesheets and export payroll data.
            </CardDescription>
          </div>
          <Button type="button" onClick={handleExport}>
            Export to CSV
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <Input
            type="search"
            placeholder="Search by consultant name or date"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="overflow-hidden rounded-md border">
            <ul>
              {filteredTimesheets.map((timesheet) => (
                <li key={timesheet.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTimesheetId(timesheet.id)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{timesheet.consultant_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {timesheet.week_start_date} - {timesheet.week_end_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{timesheet.total_hours} hours</Badge>
                        <Badge
                          variant={
                            timesheet.status === "approved"  ? "secondary"   :
                            timesheet.status === "processed" ? "default"     :
                            timesheet.status === "rejected"  ? "destructive" :
                            "outline"
                          }
                        >
                          {toUiStatus(timesheet.status)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filteredTimesheets.length === 0 && (
                <li className="px-4 py-6 text-muted-foreground">
                  No timesheets matched your search.
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedTimesheet)}
        onOpenChange={(open) => {
          if (!open) setSelectedTimesheetId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Timesheet Details</SheetTitle>
            <SheetDescription>Review and process timesheet.</SheetDescription>
          </SheetHeader>

          {selectedTimesheet ? (
            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {selectedTimesheet.consultant_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTimesheet.week_start_date} - {selectedTimesheet.week_end_date}
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="mt-1 font-semibold">{selectedTimesheet.total_hours}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold">{toUiStatus(selectedTimesheet.status)}</p>
                </CardContent>
              </Card>

              <Button
                type="button"
                onClick={() => handleMarkAsProcessed(selectedTimesheet.id)}
              >
                Mark as Processed
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}