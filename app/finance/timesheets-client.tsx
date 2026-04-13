"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { markTimesheetProcessedAction } from "./actions";

function toUiStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadgeClassName(status: string): string {
  if (status === "approved") {
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
  const [processingTimesheetId, setProcessingTimesheetId] = useState<string | null>(null);
  const [expandedConsultantIds, setExpandedConsultantIds] = useState<Record<string, boolean>>({});

  const filteredTimesheets = timesheets.filter((timesheet) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      !normalizedQuery ||
      timesheet.consultant_name.toLowerCase().includes(normalizedQuery) ||
      timesheet.week_start_date.includes(normalizedQuery)
    );
  });
  const groupedTimesheets = useMemo(() => {
    const groups = new Map<
      string,
      { consultantId: string; consultantName: string; timesheets: FinanceTimesheetRecord[] }
    >();

    for (const timesheet of filteredTimesheets) {
      const existingGroup = groups.get(timesheet.consultant_id);
      if (existingGroup) {
        existingGroup.timesheets.push(timesheet);
        continue;
      }

      groups.set(timesheet.consultant_id, {
        consultantId: timesheet.consultant_id,
        consultantName: timesheet.consultant_name,
        timesheets: [timesheet],
      });
    }

    return Array.from(groups.values());
  }, [filteredTimesheets]);

  const selectedTimesheet = timesheets.find((ts) => ts.id === selectedTimesheetId) ?? null;

  const handleMarkAsProcessed = async (timesheetId: string) => {
    setErrorMessage(null);
    setProcessingTimesheetId(timesheetId);

    const result = await markTimesheetProcessedAction({ timesheetId });

    if (!result.ok) {
      setErrorMessage(result.error);
      setProcessingTimesheetId(null);
      return;
    }

    setSelectedTimesheetId(null);
    setProcessingTimesheetId(null);
    router.refresh();
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

  const toggleConsultantGroup = (consultantId: string) => {
    setExpandedConsultantIds((current) => ({
      ...current,
      [consultantId]: current[consultantId] === undefined ? false : !current[consultantId],
    }));
  };

  const isConsultantGroupExpanded = (consultantId: string) => {
    return expandedConsultantIds[consultantId] ?? true;
  };

  const getConsultantInitials = (name: string) => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
              {groupedTimesheets.map((group, groupIndex) => {
                const isExpanded = isConsultantGroupExpanded(group.consultantId);
                const consultantTotalHours = group.timesheets.reduce(
                  (sum, timesheet) => sum + timesheet.total_hours,
                  0,
                );

                return (
                  <li key={group.consultantId} className={groupIndex > 0 ? "border-t" : undefined}>
                    <button
                      type="button"
                      onClick={() => toggleConsultantGroup(group.consultantId)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{getConsultantInitials(group.consultantName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{group.consultantName}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.timesheets.length} timesheet{group.timesheets.length === 1 ? "" : "s"} -{" "}
                            {consultantTotalHours.toFixed(2)} hours
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                    </button>

                    {isExpanded ? (
                      <ul className="border-t bg-muted/10">
                        {group.timesheets.map((timesheet) => (
                          <li key={timesheet.id} className="border-b last:border-b-0">
                            <button
                              type="button"
                              onClick={() => setSelectedTimesheetId(timesheet.id)}
                              className="w-full px-4 py-3 text-left hover:bg-muted/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">
                                    {formatDate(timesheet.week_start_date)} to {formatDate(timesheet.week_end_date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{timesheet.total_hours} hours</Badge>
                                  <Badge
                                    variant="outline"
                                    className={getStatusBadgeClassName(timesheet.status)}
                                  >
                                    {toUiStatus(timesheet.status)}
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
              {groupedTimesheets.length === 0 && (
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
                  {formatDate(selectedTimesheet.week_start_date)} to {formatDate(selectedTimesheet.week_end_date)}
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
                disabled={processingTimesheetId === selectedTimesheet.id}
                onClick={() => handleMarkAsProcessed(selectedTimesheet.id)}
              >
                {processingTimesheetId === selectedTimesheet.id
                  ? "Marking as Processed..."
                  : "Mark as Processed"}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}