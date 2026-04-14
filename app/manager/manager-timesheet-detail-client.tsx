"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { approveTimesheetAction, rejectTimesheetAction } from "./actions";
import type { ManagerTimesheetSummary } from "@/services/manager-service";
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

function getTimesheetBadgeClassName(status: ManagerTimesheetSummary["status"]) {
  if (status === "Approved" || status === "Approved Late") {
    return "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "Processed") {
    return "border-sky-600/30 bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (status === "Submitted" || status === "Submitted Late") {
    return "border-blue-600/30 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (status === "Rejected") {
    return "border-rose-600/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }
  return "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function canApproveTimesheet(status: ManagerTimesheetSummary["status"]) {
  return status === "Submitted" || status === "Submitted Late";
}

function canRejectTimesheet(status: ManagerTimesheetSummary["status"]) {
  return status === "Submitted" || status === "Submitted Late";
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ManagerTimesheetDetailClient({
  timesheet,
}: {
  timesheet: ManagerTimesheetSummary;
}) {
  const router = useRouter();
  const { isAuthenticated, role, isLoading } = useUser();
  const canManage = !isLoading && isAuthenticated && role === "manager";

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onApprove() {
    setError(null);
    const result = await approveTimesheetAction({ timesheetId: timesheet.id });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/manager/timesheets");
    router.refresh();
  }

  async function onReject() {
    if (!comment.trim()) {
      setError("A comment is required when rejecting a timesheet.");
      return;
    }
    setError(null);
    const result = await rejectTimesheetAction({
      timesheetId: timesheet.id,
      comment,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/manager/timesheets");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Timesheet detail</CardTitle>
            <CardDescription>
              Full consultant submission view with manager review actions.
            </CardDescription>
          </div>

          <Button asChild variant="outline">
            <Link href="/manager/timesheets">Back to timesheets</Link>
          </Button>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">Consultant:</span> {timesheet.consultantName}
          </div>
          <div>
            <span className="font-medium">Project:</span> {timesheet.projectName || timesheet.projectCode || "-"}
          </div>
          <div>
            <span className="font-medium">Week:</span> {timesheet.weekStart} to {timesheet.weekEnd}
          </div>
          <div>
            <span className="font-medium">Total Hours:</span> {timesheet.totalHours}
          </div>
          <div>
            <span className="font-medium">Submitted At:</span> {formatSubmittedAt(timesheet.submittedAt)}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant="outline" className={getTimesheetBadgeClassName(timesheet.status)}>
              {timesheet.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {timesheet.managerComment ? (
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Latest manager comment</p>
            <p className="mt-1 whitespace-pre-wrap">{timesheet.managerComment}</p>
          </div>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(timesheet.entries ?? []).map((entry, index) => (
                <TableRow key={`${entry.date}-${index}`}>
                  <TableCell>{entry.dayLabel}</TableCell>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell className="text-right">{entry.hours}</TableCell>
                  <TableCell>{entry.description || "-"}</TableCell>
                </TableRow>
              ))}
              {(timesheet.entries ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No submitted entries found for this timesheet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {!isLoading && !canManage ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            You must be logged in as a <span className="font-semibold">manager</span> to approve or reject this
            timesheet.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsApproving((value) => !value);
              setIsRejecting(false);
              setError(null);
            }}
            disabled={!canManage || !canApproveTimesheet(timesheet.status)}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setIsRejecting((value) => !value);
              setIsApproving(false);
              setError(null);
            }}
            disabled={!canManage || !canRejectTimesheet(timesheet.status)}
          >
            Reject
          </Button>
        </div>

        {isApproving ? (
          <div className="space-y-3 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Confirm that you have reviewed this timesheet and it is ready to be approved.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onApprove} disabled={!canManage}>
                Confirm Approve
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsApproving(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {isRejecting ? (
          <div className="space-y-3 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Comment (required)</p>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Explain what needs fixing."
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
            />
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={onReject} disabled={!canManage}>
                Confirm Reject
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
