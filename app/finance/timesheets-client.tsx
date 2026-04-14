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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FinanceTimesheetRecord } from "@/services/finance-service";
import { markTimesheetProcessedAction, markTimesheetsExportedAction } from "./actions";

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

function formatHours(value: number): string {
  const label = Math.abs(value) === 1 ? "hour" : "hours";
  return `${value} ${label}`;
}

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [processingTimesheetId, setProcessingTimesheetId] = useState<string | null>(null);
  const [exportingConsultantId, setExportingConsultantId] = useState<string | null>(null);
  const [timesheetToMarkId, setTimesheetToMarkId] = useState<string | null>(null);
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

  const handleMarkAsProcessed = async () => {
    if (!timesheetToMarkId) return;

    setErrorMessage(null);
    setProcessingTimesheetId(timesheetToMarkId);

    const result = await markTimesheetProcessedAction({ timesheetId: timesheetToMarkId });

    if (!result.ok) {
      setErrorMessage(result.error);
      setProcessingTimesheetId(null);
      return;
    }

    setTimesheetToMarkId(null);
    setProcessingTimesheetId(null);
    router.refresh();
  };

  const handleExportForConsultant = async (
    consultantId: string,
    consultantName: string,
    consultantTimesheets: FinanceTimesheetRecord[],
  ) => {
    setErrorMessage(null);
    setExportingConsultantId(consultantId);

    const headers = ["Consultant", "Week Start", "Week End", "Total Hours", "Status"];
    const rows = consultantTimesheets.map((ts) => [
      toCsvCell(ts.consultant_name),
      toCsvCell(ts.week_start_date),
      toCsvCell(ts.week_end_date),
      toCsvCell(ts.total_hours.toString()),
      toCsvCell(ts.status),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = consultantName.trim().replace(/\s+/g, "_").toLowerCase();
    link.download = `timesheets_export_${safeName}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    const timesheetIdsToMarkExported = consultantTimesheets
      .filter((timesheet) => !timesheet.export_completed)
      .map((timesheet) => timesheet.id);

    if (timesheetIdsToMarkExported.length > 0) {
      const result = await markTimesheetsExportedAction({
        timesheetIds: timesheetIdsToMarkExported,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        setExportingConsultantId(null);
        return;
      }
    }

    setExportingConsultantId(null);
    router.refresh();
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

          <div className="max-h-[62vh] overflow-auto rounded-md border">
            <ul>
              {groupedTimesheets.map((group, groupIndex) => {
                const isExpanded = isConsultantGroupExpanded(group.consultantId);
                const consultantTotalHours = group.timesheets.reduce(
                  (sum, timesheet) => sum + timesheet.total_hours,
                  0,
                );

                return (
                  <li key={group.consultantId} className={groupIndex > 0 ? "border-t" : undefined}>
                    <div className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                      <button
                        type="button"
                        onClick={() => toggleConsultantGroup(group.consultantId)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Avatar size="sm">
                          <AvatarFallback>{getConsultantInitials(group.consultantName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{group.consultantName}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.timesheets.length} timesheet{group.timesheets.length === 1 ? "" : "s"} -{" "}
                            {formatHours(Number(consultantTotalHours.toFixed(2)))}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleExportForConsultant(
                              group.consultantId,
                              group.consultantName,
                              group.timesheets,
                            )
                          }
                          disabled={exportingConsultantId === group.consultantId}
                        >
                          {exportingConsultantId === group.consultantId
                            ? "Exporting..."
                            : "Export CSV"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => toggleConsultantGroup(group.consultantId)}
                          className="text-muted-foreground"
                          aria-label={isExpanded ? "Collapse consultant timesheets" : "Expand consultant timesheets"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ul className="border-t bg-muted/10">
                        {group.timesheets.map((timesheet) => (
                          <li key={timesheet.id} className="border-b last:border-b-0">
                            <div className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">
                                    {formatDate(timesheet.week_start_date)} to {formatDate(timesheet.week_end_date)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{formatHours(timesheet.total_hours)}</Badge>
                                  <Badge
                                    variant="outline"
                                    className={getStatusBadgeClassName(timesheet.status)}
                                  >
                                    {toUiStatus(timesheet.status)}
                                  </Badge>
                                  {timesheet.status === "approved" ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => setTimesheetToMarkId(timesheet.id)}
                                      disabled={
                                        processingTimesheetId === timesheet.id ||
                                        !timesheet.export_completed
                                      }
                                      title={
                                        timesheet.export_completed
                                          ? ""
                                          : "Export this consultant's CSV before marking as processed"
                                      }
                                    >
                                      {processingTimesheetId === timesheet.id
                                        ? "Marking as Processed..."
                                        : "Mark as Processed"}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
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

      <Dialog
        open={timesheetToMarkId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !processingTimesheetId) {
            setTimesheetToMarkId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark this timesheet as processed?</DialogTitle>
            <DialogDescription>
              This will move the timesheet to processed and close finance handling for it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTimesheetToMarkId(null)}
              disabled={Boolean(processingTimesheetId)}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsProcessed} disabled={Boolean(processingTimesheetId)}>
              {processingTimesheetId ? "Marking as Processed..." : "Yes, mark as processed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}