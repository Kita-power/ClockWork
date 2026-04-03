"use client";

import { useMemo, useState, useTransition } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadConsultantWeeklyTimesheetAction,
  saveConsultantTimesheetDraftAction,
  submitConsultantTimesheetAction,
} from "./actions";
import type {
  WeeklyTimesheetEntry,
  WeeklyTimesheetRecord,
} from "@/services/consultant-service";

type ConsultantTimesheetClientProps = {
  initialTimesheet: WeeklyTimesheetRecord;
  initialError: string | null;
};

function normalizeProjectCode(projectCode: string): string {
  return projectCode.trim().toUpperCase();
}

function applyProjectCodeToEntries(
  entries: WeeklyTimesheetEntry[],
  projectCode: string,
): WeeklyTimesheetEntry[] {
  const normalizedProjectCode = normalizeProjectCode(projectCode);
  return entries.map((entry) => ({
    ...entry,
    projectCode: normalizedProjectCode,
  }));
}

function resolveSelectedProjectCode(
  timesheet: WeeklyTimesheetRecord,
): string {
  const firstEntryProjectCode = timesheet.entries.find(
    (entry) => normalizeProjectCode(entry.projectCode).length > 0,
  )?.projectCode;

  const normalizedEntryProjectCode = firstEntryProjectCode
    ? normalizeProjectCode(firstEntryProjectCode)
    : "";

  if (normalizedEntryProjectCode) {
    return normalizedEntryProjectCode;
  }

  return "";
}

function initializeTimesheet(
  timesheet: WeeklyTimesheetRecord,
): WeeklyTimesheetRecord {
  const selectedProjectCode = resolveSelectedProjectCode(timesheet);

  if (!selectedProjectCode) {
    return timesheet;
  }

  return {
    ...timesheet,
    entries: applyProjectCodeToEntries(timesheet.entries, selectedProjectCode),
  };
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ConsultantTimesheetClient({
  initialTimesheet,
  initialError,
}: ConsultantTimesheetClientProps) {
  const router = useRouter();
  const [timesheet, setTimesheet] = useState(() =>
    initializeTimesheet(initialTimesheet),
  );
  const [selectedProjectCode, setSelectedProjectCode] = useState(() =>
    resolveSelectedProjectCode(initialTimesheet),
  );
  const [hoursDraftByIndex, setHoursDraftByIndex] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSubmitted = timesheet.status === "submitted";

  const totalHours = useMemo(
    () =>
      timesheet.entries.reduce((sum, entry) => {
        const normalizedHours = Number.isFinite(entry.hours) ? entry.hours : 0;
        return sum + normalizedHours;
      }, 0),
    [timesheet.entries],
  );

  const hasInvalidHours = useMemo(
    () => timesheet.entries.some((entry) => entry.hours < 0 || entry.hours > 24),
    [timesheet.entries],
  );

  const hasProjectCodeValidationError = selectedProjectCode.length === 0;

  function updateEntry(
    index: number,
    patch: Partial<WeeklyTimesheetEntry>,
  ): void {
    if (isSubmitted) return;

    setTimesheet((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function loadWeek(weekStart: string): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      loadConsultantWeeklyTimesheetAction(weekStart).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        const nextSelectedProjectCode = resolveSelectedProjectCode(result.timesheet);

        setSelectedProjectCode(nextSelectedProjectCode);
        setTimesheet(initializeTimesheet(result.timesheet));
        router.replace(`/consultant/timesheets/${result.timesheet.id}`);
      });
    });
  }

  function updateWeeklyProjectCode(projectCode: string): void {
    if (isSubmitted) return;

    const normalizedProjectCode = normalizeProjectCode(projectCode);
    setSelectedProjectCode(normalizedProjectCode);
    setTimesheet((prev) => ({
      ...prev,
      entries: applyProjectCodeToEntries(prev.entries, normalizedProjectCode),
    }));
  }

  function saveDraft(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      saveConsultantTimesheetDraftAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: timesheet.entries,
      }).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setSuccessMessage(result.message);
        router.replace(`/consultant/timesheets/${timesheet.id}`);
        router.refresh();
      });
    });
  }

  function submitTimesheet(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(() => {
      submitConsultantTimesheetAction({
        id: timesheet.id,
        weekStart: timesheet.weekStart,
        entries: timesheet.entries,
      }).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setTimesheet((prev) => ({ ...prev, status: "submitted" }));
        setSuccessMessage(result.message);
        router.replace(`/consultant/timesheets/${timesheet.id}`);
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Weekly Timesheet</CardTitle>
            <CardDescription>
              Enter billable work for the selected week, save as draft, and submit when complete.
            </CardDescription>
          </div>
          <Badge variant={isSubmitted ? "secondary" : "outline"}>
            {isSubmitted ? "Submitted" : "Draft"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="weekStart">
              Week starting
            </label>
            <Input
              id="weekStart"
              type="date"
              value={timesheet.weekStart}
              onChange={(event) => loadWeek(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="projectCode">
              Project code
            </label>
            <Input
              id="projectCode"
              value={selectedProjectCode}
              onChange={(event) => updateWeeklyProjectCode(event.target.value)}
              placeholder="e.g. PROJ-001"
              disabled={isSubmitted || isPending}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Day</TableHead>
                <TableHead className="w-[120px]">Hours</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.entries.map((entry, index) => (
                <TableRow key={entry.date}>
                  <TableCell>
                    <div className="font-medium">{entry.dayLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      step={0.25}
                      value={hoursDraftByIndex[index] ?? String(entry.hours)}
                      onFocus={() => {
                        setHoursDraftByIndex((prev) => ({
                          ...prev,
                          [index]: String(entry.hours),
                        }));
                      }}
                      onBlur={() => {
                        const draft = hoursDraftByIndex[index] ?? String(entry.hours);
                        const normalized = Number.parseFloat(draft);

                        updateEntry(index, {
                          hours: Number.isNaN(normalized) ? 0 : normalized,
                        });

                        setHoursDraftByIndex((prev) => {
                          const next = { ...prev };
                          delete next[index];
                          return next;
                        });
                      }}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        const nextHours = Number.parseFloat(rawValue);

                        setHoursDraftByIndex((prev) => ({
                          ...prev,
                          [index]: rawValue,
                        }));

                        updateEntry(index, {
                          hours: Number.isNaN(nextHours) ? 0 : nextHours,
                        });
                      }}
                      disabled={isSubmitted || isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.notes}
                      onChange={(event) =>
                        updateEntry(index, { notes: event.target.value })
                      }
                      placeholder="Add short note"
                      disabled={isSubmitted || isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Week range: {formatDate(timesheet.weekStart)} to {formatDate(timesheet.weekEnd)}
            </div>
            <div className="text-sm font-semibold">Total hours: {totalHours.toFixed(2)}</div>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {hasProjectCodeValidationError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Select a project code for this weekly timesheet.
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={
                isPending ||
                isSubmitted ||
                hasInvalidHours ||
                hasProjectCodeValidationError
              }
            >
              Save Draft
            </Button>
            <Button
              onClick={submitTimesheet}
              disabled={
                isPending ||
                isSubmitted ||
                hasInvalidHours ||
                hasProjectCodeValidationError ||
                totalHours <= 0
              }
            >
              Submit Timesheet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
