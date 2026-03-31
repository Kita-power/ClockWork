"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { ManagerTimesheetSummary } from "./mock-data";

type LocalTimesheet = ManagerTimesheetSummary & {
  managerComment?: string;
};

type StatusFilter = "all" | LocalTimesheet["status"];

function badgeVariant(status: string) {
  if (status === "Overdue") return "destructive";
  if (status.includes("Late")) return "outline";
  if (status === "Approved" || status === "Processed") return "secondary";
  return "default";
}

export function ManagerDashboardClient({
  initialTimesheets,
}: {
  initialTimesheets: ManagerTimesheetSummary[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [timesheets, setTimesheets] = useState<LocalTimesheet[]>(
    initialTimesheets.map((t) => ({ ...t })),
  );

  // Auth info (not enforcing yet—just available for later)
  const { isAuthenticated, role, isLoading } = useUser();
  const canManage = !isLoading && isAuthenticated && role === "manager";

  // Panel state (store the selected timesheet IDs)
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Reject form state
  const [rejectComment, setRejectComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Derive the full selected objects (so panel shows name/project/week, not just TS-1002)
  const approvingTimesheet = useMemo(
    () => (approvingId ? timesheets.find((t) => t.id === approvingId) ?? null : null),
    [approvingId, timesheets],
  );

  const rejectingTimesheet = useMemo(
    () => (rejectingId ? timesheets.find((t) => t.id === rejectingId) ?? null : null),
    [rejectingId, timesheets],
  );

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const t of timesheets) {
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    }
    return { all: timesheets.length, byStatus };
  }, [timesheets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return timesheets.filter((t) => {
      const matchesSearch =
        !q ||
        t.consultantName.toLowerCase().includes(q) ||
        t.projectCode.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [timesheets, search, statusFilter]);

  function openApprove(id: string) {
    // Ensure only one panel can be open at a time
    setRejectingId(null);
    setRejectComment("");
    setError(null);

    setApprovingId(id);
  }

  function confirmApprove() {
    if (!approvingId) return;

    // Mock behaviour: change status locally
    setTimesheets((prev) =>
      prev.map((t) => (t.id === approvingId ? { ...t, status: "Approved" } : t)),
    );

    setApprovingId(null);
  }

  function openReject(id: string) {
    // Ensure only one panel can be open at a time
    setApprovingId(null);

    setError(null);
    setRejectingId(id);
    setRejectComment("");
  }

  function confirmReject() {
    if (!rejectingId) return;

    if (!rejectComment.trim()) {
      setError("A comment is required when rejecting a timesheet.");
      return;
    }

    setTimesheets((prev) =>
      prev.map((t) =>
        t.id === rejectingId
          ? { ...t, status: "Rejected", managerComment: rejectComment.trim() }
          : t,
      ),
    );

    setRejectingId(null);
    setRejectComment("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timesheets to review</CardTitle>
          <CardDescription>
            Search, filter, approve, or reject submitted timesheets. (Mock actions for now)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Search by consultant, project, id, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="all" className="flex-none">
                All ({counts.all})
              </TabsTrigger>

              <TabsTrigger value="Overdue" className="flex-none">
                Overdue ({counts.byStatus.get("Overdue") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Submitted" className="flex-none">
                Submitted ({counts.byStatus.get("Submitted") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Submitted Late" className="flex-none">
                Submitted Late ({counts.byStatus.get("Submitted Late") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Approved" className="flex-none">
                Approved ({counts.byStatus.get("Approved") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Approved Late" className="flex-none">
                Approved Late ({counts.byStatus.get("Approved Late") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Rejected" className="flex-none">
                Rejected ({counts.byStatus.get("Rejected") ?? 0})
              </TabsTrigger>
              <TabsTrigger value="Processed" className="flex-none">
                Processed ({counts.byStatus.get("Processed") ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* APPROVE CONFIRM PANEL */}
          {approvingTimesheet ? (
            <div className="rounded-md border p-4 space-y-3">
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
                    <span className="font-mono">{approvingTimesheet.projectCode}</span>{" "}
                    • Week {approvingTimesheet.weekStart} → {approvingTimesheet.weekEnd} •{" "}
                    <span className="font-mono">{approvingTimesheet.id}</span>
                  </p>
                </div>

                <Button type="button" variant="ghost" onClick={() => setApprovingId(null)}>
                  Cancel
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Confirm that you have reviewed this timesheet and it’s ready to be approved.
              </p>

              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={confirmApprove}>
                  Confirm Approve
                </Button>
                <Button type="button" variant="outline" onClick={() => setApprovingId(null)}>
                  Keep Reviewing
                </Button>
              </div>
            </div>
          ) : null}

          {/* REJECT PANEL */}
          {rejectingTimesheet ? (
            <div className="rounded-md border p-4 space-y-3">
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
                    <span className="font-mono">{rejectingTimesheet.projectCode}</span>{" "}
                    • Week {rejectingTimesheet.weekStart} → {rejectingTimesheet.weekEnd} •{" "}
                    <span className="font-mono">{rejectingTimesheet.id}</span>
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectComment("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Comment (required)</p>

                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Explain what needs fixing (e.g., wrong project code, missing hours, etc.)"
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={4}
                />

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={confirmReject}>
                  Confirm Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectComment("");
                    setError(null);
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
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.consultantName}</TableCell>
                    <TableCell className="font-mono text-xs">{t.projectCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.weekStart} → {t.weekEnd}
                    </TableCell>
                    <TableCell className="text-right">{t.totalHours}</TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant(t.status)}>{t.status}</Badge>

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
                          variant="secondary"
                          onClick={() => openApprove(t.id)}
                          disabled={t.status === "Approved" || t.status === "Processed"}
                        >
                          Approve
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => openReject(t.id)}
                          disabled={t.status === "Processed"}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No timesheets found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* optional dev note */}
          <p className="text-xs text-muted-foreground">
            Auth detected:{" "}
            {isLoading ? "Loading…" : isAuthenticated ? `Logged in (${role ?? "unknown"})` : "Guest"}.
            (Manager actions are still mock.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}