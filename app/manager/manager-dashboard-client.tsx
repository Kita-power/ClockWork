
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import {
  approveLeaveRequestAction,
  approveTimesheetAction,
  rejectLeaveRequestAction,
  rejectTimesheetAction,
} from "./actions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import type {
  ManagerLeaveRequestSummary,
  ManagerTimesheetSummary,
} from "./mock-data";

type LocalTimesheet = ManagerTimesheetSummary & {
  managerComment?: string;
};

type LocalLeaveRequest = ManagerLeaveRequestSummary & {
  managerComment?: string;
};

type TimesheetStatusFilter = "all" | LocalTimesheet["status"];
type LeaveStatusFilter = "all" | LocalLeaveRequest["status"];

function getTimesheetBadgeClassName(status: LocalTimesheet["status"]) {
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

function getLeaveBadgeClassName(status: LocalLeaveRequest["status"]) {
  if (status === "Approved") {
    return "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "Rejected") {
    return "border-rose-600/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  }
  return "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function canApproveTimesheet(status: LocalTimesheet["status"]) {
  return (
    status === "Submitted" ||
    status === "Submitted Late" 
  );
}

function canRejectTimesheet(status: LocalTimesheet["status"]) {
  return (
    status === "Submitted" ||
    status === "Submitted Late" 
  );
}

function canApproveLeave(status: LocalLeaveRequest["status"]) {
  return status === "Pending";
}

function canRejectLeave(status: LocalLeaveRequest["status"]) {
  return status === "Pending";
}

export function ManagerDashboardClient({
  initialTimesheets,
  initialLeaveRequests,
}: {
  initialTimesheets: ManagerTimesheetSummary[];
  initialLeaveRequests: ManagerLeaveRequestSummary[];
}) {
  const [timesheetSearch, setTimesheetSearch] = useState("");
  const [leaveSearch, setLeaveSearch] = useState("");

  const [timesheetStatusFilter, setTimesheetStatusFilter] =
    useState<TimesheetStatusFilter>("all");
  const [leaveStatusFilter, setLeaveStatusFilter] =
    useState<LeaveStatusFilter>("all");

  const [timesheets, setTimesheets] = useState<LocalTimesheet[]>(
    initialTimesheets.map((t) => ({ ...t })),
  );

  useEffect(() => {
    setTimesheets(initialTimesheets.map((t) => ({ ...t })));
  }, [initialTimesheets]);
  
  useEffect(() => {
    setLeaveRequests(initialLeaveRequests.map((r) => ({ ...r })));
  }, [initialLeaveRequests]);

  const [leaveRequests, setLeaveRequests] = useState<LocalLeaveRequest[]>(
    initialLeaveRequests.map((r) => ({ ...r })),
  );

  const { isAuthenticated, role, isLoading } = useUser();
  const router = useRouter();
  const canManage = !isLoading && isAuthenticated && role === "manager";

  const [approvingTimesheetId, setApprovingTimesheetId] = useState<string | null>(null);
  const [rejectingTimesheetId, setRejectingTimesheetId] = useState<string | null>(null);

  const [approvingLeaveId, setApprovingLeaveId] = useState<string | null>(null);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);

  const [timesheetRejectComment, setTimesheetRejectComment] = useState("");
  const [leaveRejectComment, setLeaveRejectComment] = useState("");

  const [timesheetError, setTimesheetError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const approvingTimesheet = useMemo(() => {
    if (!approvingTimesheetId) return null;
    return timesheets.find((t) => t.id === approvingTimesheetId) ?? null;
  }, [approvingTimesheetId, timesheets]);

  const rejectingTimesheet = useMemo(() => {
    if (!rejectingTimesheetId) return null;
    return timesheets.find((t) => t.id === rejectingTimesheetId) ?? null;
  }, [rejectingTimesheetId, timesheets]);

  const approvingLeave = useMemo(() => {
    if (!approvingLeaveId) return null;
    return leaveRequests.find((r) => r.id === approvingLeaveId) ?? null;
  }, [approvingLeaveId, leaveRequests]);

  const rejectingLeave = useMemo(() => {
    if (!rejectingLeaveId) return null;
    return leaveRequests.find((r) => r.id === rejectingLeaveId) ?? null;
  }, [rejectingLeaveId, leaveRequests]);

  const timesheetCounts = useMemo(() => {
    const byStatus = new Map<string, number>();

    for (const t of timesheets) {
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    }

    return {
      all: timesheets.length,
      byStatus,
    };
  }, [timesheets]);

  const leaveCounts = useMemo(() => {
    const byStatus = new Map<string, number>();

    for (const r of leaveRequests) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    }

    return {
      all: leaveRequests.length,
      byStatus,
    };
  }, [leaveRequests]);

  const filteredTimesheets = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();

    return timesheets.filter((t) => {
      const matchesSearch =
        !q ||
        t.consultantName.toLowerCase().includes(q) ||
        t.projectCode.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q);

      const matchesStatus =
        timesheetStatusFilter === "all"
          ? true
          : t.status === timesheetStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [timesheets, timesheetSearch, timesheetStatusFilter]);

  const filteredLeaveRequests = useMemo(() => {
    const q = leaveSearch.trim().toLowerCase();

    return leaveRequests.filter((r) => {
      const matchesSearch =
        !q ||
        r.consultantName.toLowerCase().includes(q) ||
        r.leaveType.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);

      const matchesStatus =
        leaveStatusFilter === "all"
          ? true
          : r.status === leaveStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaveRequests, leaveSearch, leaveStatusFilter]);

  function openViewTimesheet(id: string) {
    router.push(`/manager/timesheet/${id}`);
  }

  function openApproveTimesheet(id: string) {
    setRejectingTimesheetId(null);
    setTimesheetRejectComment("");
    setTimesheetError(null);
    setApprovingTimesheetId(id);
  }

  function openRejectTimesheet(id: string) {
    setApprovingTimesheetId(null);
    setTimesheetError(null);
    setRejectingTimesheetId(id);
    setTimesheetRejectComment("");
  }

  async function confirmApproveTimesheet() {
    if (!approvingTimesheetId) return;

    setTimesheetError(null);

    const result = await approveTimesheetAction({
      timesheetId: approvingTimesheetId,
    });

    if (!result.ok) {
      setTimesheetError(result.error);
      return;
    }

    setApprovingTimesheetId(null);
    router.refresh();
  }

  async function confirmRejectTimesheet() {
    if (!rejectingTimesheetId) return;

    if (!timesheetRejectComment.trim()) {
      setTimesheetError("A comment is required when rejecting a timesheet.");
      return;
    }

    setTimesheetError(null);

    const result = await rejectTimesheetAction({
      timesheetId: rejectingTimesheetId,
      comment: timesheetRejectComment,
    });

    if (!result.ok) {
      setTimesheetError(result.error);
      return;
    }

    setRejectingTimesheetId(null);
    setTimesheetRejectComment("");
    router.refresh();
  }

  function openApproveLeave(id: string) {
    setRejectingLeaveId(null);
    setLeaveRejectComment("");
    setLeaveError(null);
    setApprovingLeaveId(id);
  }

  function openRejectLeave(id: string) {
    setApprovingLeaveId(null);
    setLeaveError(null);
    setRejectingLeaveId(id);
    setLeaveRejectComment("");
  }

  async function confirmApproveLeave() {
    if (!approvingLeaveId) return;

    setLeaveError(null);

    const result = await approveLeaveRequestAction({
      leaveRequestId: approvingLeaveId,
    });

    if (!result.ok) {
      setLeaveError(result.error);
      return;
    }

    setApprovingLeaveId(null);
    router.refresh();
  }

  async function confirmRejectLeave() {
    if (!rejectingLeaveId) return;

    if (!leaveRejectComment.trim()) {
      setLeaveError("A comment is required when rejecting a leave request.");
      return;
    }

    setLeaveError(null);

    const result = await rejectLeaveRequestAction({
      leaveRequestId: rejectingLeaveId,
      comment: leaveRejectComment,
    });

    if (!result.ok) {
      setLeaveError(result.error);
      return;
    }

    setRejectingLeaveId(null);
    setLeaveRejectComment("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager review dashboard</CardTitle>
        <CardDescription>
          Review submitted timesheets and leave requests. Prototype actions are
          currently simulated in the UI.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="timesheets" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="timesheets" className="space-y-4">
            <Input
              placeholder="Search by consultant, project, ID, or status..."
              value={timesheetSearch}
              onChange={(e) => setTimesheetSearch(e.target.value)}
            />

            {!isLoading && !canManage ? (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                You must be logged in as a <span className="font-semibold">manager</span> to
                approve or reject timesheets and leave requests.
              </div>
            ) : null}

            <Tabs
              value={timesheetStatusFilter}
              onValueChange={(value) =>
                setTimesheetStatusFilter(value as TimesheetStatusFilter)
              }
            >
              <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="all" className="flex-none">
                  All ({timesheetCounts.all})
                </TabsTrigger>
                
                <TabsTrigger value="Submitted" className="flex-none">
                  Submitted ({timesheetCounts.byStatus.get("Submitted") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Submitted Late" className="flex-none">
                  Submitted Late ({timesheetCounts.byStatus.get("Submitted Late") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Approved" className="flex-none">
                  Approved ({timesheetCounts.byStatus.get("Approved") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Approved Late" className="flex-none">
                  Approved Late ({timesheetCounts.byStatus.get("Approved Late") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Rejected" className="flex-none">
                  Rejected ({timesheetCounts.byStatus.get("Rejected") ?? 0})
                </TabsTrigger>
                
              </TabsList>
            </Tabs>

            {approvingTimesheet ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Approve timesheet for{" "}
                      <span className="font-semibold">
                        {approvingTimesheet.consultantName}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Project{" "}
                      <span className="font-mono">
                        {approvingTimesheet.projectCode}
                      </span>{" "}
                      • Week {approvingTimesheet.weekStart} →{" "}
                      {approvingTimesheet.weekEnd} •{" "}
                      <span className="font-mono">{approvingTimesheet.id}</span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setApprovingTimesheetId(null)}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Confirm that you have reviewed this timesheet and it is ready
                  to be approved.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={confirmApproveTimesheet}
                    disabled={!canManage}
                  >
                    Confirm Approve
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApprovingTimesheetId(null)}
                  >
                    Keep Reviewing
                  </Button>
                </div>
              </div>
            ) : null}

            {rejectingTimesheet ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Reject timesheet for{" "}
                      <span className="font-semibold">
                        {rejectingTimesheet.consultantName}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Project{" "}
                      <span className="font-mono">
                        {rejectingTimesheet.projectCode}
                      </span>{" "}
                      • Week {rejectingTimesheet.weekStart} →{" "}
                      {rejectingTimesheet.weekEnd} •{" "}
                      <span className="font-mono">{rejectingTimesheet.id}</span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRejectingTimesheetId(null);
                      setTimesheetRejectComment("");
                      setTimesheetError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Comment (required)
                  </p>

                  <textarea
                    value={timesheetRejectComment}
                    onChange={(e) => setTimesheetRejectComment(e.target.value)}
                    placeholder="Explain what needs fixing, for example wrong project code or missing hours."
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={4}
                  />

                  {timesheetError ? (
                    <p className="text-sm text-destructive">{timesheetError}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmRejectTimesheet}
                    disabled={!canManage}
                  >
                    Confirm Reject
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRejectingTimesheetId(null);
                      setTimesheetRejectComment("");
                      setTimesheetError(null);
                    }}
                  >
                    Keep Reviewing
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTimesheets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.consultantName}
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {t.projectCode}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {t.weekStart} → {t.weekEnd}
                      </TableCell>

                      <TableCell className="text-right">
                        {t.totalHours}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={getTimesheetBadgeClassName(t.status)}>
                          {t.status}
                        </Badge>

                        {t.status === "Rejected" && t.managerComment ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">Comment:</span>
                            <div className="mt-1 max-h-16 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-2">
                              {t.managerComment}
                            </div>
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openViewTimesheet(t.id)}
                          >
                            View
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openApproveTimesheet(t.id)}
                            disabled={!canManage || !canApproveTimesheet(t.status)}
                          >
                            Approve
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectTimesheet(t.id)}
                            disabled={!canManage || !canRejectTimesheet(t.status)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredTimesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No timesheets found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="leave-requests" className="space-y-4">
            <Input
              placeholder="Search by consultant, leave type, ID, or status..."
              value={leaveSearch}
              onChange={(e) => setLeaveSearch(e.target.value)}
            />

            <Tabs
              value={leaveStatusFilter}
              onValueChange={(value) =>
                setLeaveStatusFilter(value as LeaveStatusFilter)
              }
            >
              <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="all" className="flex-none">
                  All ({leaveCounts.all})
                </TabsTrigger>
                <TabsTrigger value="Pending" className="flex-none">
                  Pending ({leaveCounts.byStatus.get("Pending") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Approved" className="flex-none">
                  Approved ({leaveCounts.byStatus.get("Approved") ?? 0})
                </TabsTrigger>
                <TabsTrigger value="Rejected" className="flex-none">
                  Rejected ({leaveCounts.byStatus.get("Rejected") ?? 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {approvingLeave ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Approve leave request for{" "}
                      <span className="font-semibold">
                        {approvingLeave.consultantName}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {approvingLeave.leaveType} • {approvingLeave.startDate} →{" "}
                      {approvingLeave.endDate} • {approvingLeave.durationDays} day(s) •{" "}
                      <span className="font-mono">{approvingLeave.id}</span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setApprovingLeaveId(null)}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Confirm that you want to approve this leave request.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={confirmApproveLeave}
                    disabled={!canManage}
                  >
                    Confirm Approve
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApprovingLeaveId(null)}
                  >
                    Keep Reviewing
                  </Button>
                </div>
              </div>
            ) : null}

            {rejectingLeave ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Reject leave request for{" "}
                      <span className="font-semibold">
                        {rejectingLeave.consultantName}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {rejectingLeave.leaveType} • {rejectingLeave.startDate} →{" "}
                      {rejectingLeave.endDate} • {rejectingLeave.durationDays} day(s) •{" "}
                      <span className="font-mono">{rejectingLeave.id}</span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRejectingLeaveId(null);
                      setLeaveRejectComment("");
                      setLeaveError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Comment (required)
                  </p>

                  <textarea
                    value={leaveRejectComment}
                    onChange={(e) => setLeaveRejectComment(e.target.value)}
                    placeholder="Explain why this leave request is being rejected."
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={4}
                  />

                  {leaveError ? (
                    <p className="text-sm text-destructive">{leaveError}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmRejectLeave}
                    disabled={!canManage}
                  >
                    Confirm Reject
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRejectingLeaveId(null);
                      setLeaveRejectComment("");
                      setLeaveError(null);
                    }}
                  >
                    Keep Reviewing
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLeaveRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.consultantName}
                      </TableCell>

                      <TableCell>{r.leaveType}</TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {r.startDate} → {r.endDate}
                      </TableCell>

                      <TableCell className="text-right">
                        {r.durationDays} day{r.durationDays === 1 ? "" : "s"}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={getLeaveBadgeClassName(r.status)}>
                          {r.status}
                        </Badge>

                        {r.status === "Rejected" && r.managerComment ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">Comment:</span>
                            <div className="mt-1 max-h-16 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-2">
                              {r.managerComment}
                            </div>
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openApproveLeave(r.id)}
                            disabled={!canManage || !canApproveLeave(r.status)}
                          >
                            Approve
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectLeave(r.id)}
                            disabled={!canManage || !canRejectLeave(r.status)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredLeaveRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-xs text-muted-foreground">
          Auth detected:{" "}
          {isLoading
            ? "Loading..."
            : isAuthenticated
              ? `Logged in (${role ?? "unknown"})`
              : "Guest"}
          
        </p>
      </CardContent>
    </Card>
  );
}