
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
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
  ManagerTimesheetSummary,
} from "./mock-data";

type LocalTimesheet = ManagerTimesheetSummary & {
  managerComment?: string;
};

type TimesheetStatusFilter = "all" | LocalTimesheet["status"];

function getTimesheetBadgeClassName(status: LocalTimesheet["status"]) {
  if (status === "Approved") {
    return "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "Approved Late") {
    return "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
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

export function ManagerDashboardClient({
  initialTimesheets,
}: {
  initialTimesheets: ManagerTimesheetSummary[];
}) {
  const [timesheetSearch, setTimesheetSearch] = useState("");

  const [timesheetStatusFilter, setTimesheetStatusFilter] =
    useState<TimesheetStatusFilter>("all");

  const [timesheets, setTimesheets] = useState<LocalTimesheet[]>(
    initialTimesheets.map((t) => ({ ...t })),
  );

  useEffect(() => {
    setTimesheets(initialTimesheets.map((t) => ({ ...t })));
  }, [initialTimesheets]);
  
  const { isAuthenticated, role, isLoading } = useUser();
  const router = useRouter();
  const canManage = !isLoading && isAuthenticated && role === "manager";

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

  const filteredTimesheets = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();

    return timesheets.filter((t) => {
      const matchesSearch =
        !q ||
        t.consultantName.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
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
  const timesheetsNeedingApproval = useMemo(
    () =>
      filteredTimesheets.filter(
        (timesheet) =>
          timesheet.status === "Submitted" || timesheet.status === "Submitted Late",
      ),
    [filteredTimesheets],
  );
  const otherFilteredTimesheets = useMemo(
    () =>
      filteredTimesheets.filter(
        (timesheet) =>
          timesheet.status !== "Submitted" && timesheet.status !== "Submitted Late",
      ),
    [filteredTimesheets],
  );

  function openViewTimesheet(id: string) {
    router.push(`/manager/timesheet/${id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager review dashboard</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
            <Input
              placeholder="Search by consultant, project, ID, or status..."
              value={timesheetSearch}
              onChange={(e) => setTimesheetSearch(e.target.value)}
            />

            {!isLoading && !canManage ? (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                You must be logged in as a <span className="font-semibold">manager</span> to
                access manager timesheets.
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

            <div className="space-y-4">
              <div className="rounded-md border border-amber-500/30">
                <div className="flex items-center justify-between border-b bg-amber-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Needs Approval
                  </p>
                  <Badge variant="outline" className="border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {timesheetsNeedingApproval.length}
                  </Badge>
                </div>
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
                    {timesheetsNeedingApproval.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No timesheets currently need approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      timesheetsNeedingApproval.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.consultantName}</TableCell>
                          <TableCell className="text-xs">
                            {t.projectName || t.projectCode || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.weekStart} → {t.weekEnd}
                          </TableCell>
                          <TableCell className="text-right">{t.totalHours}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTimesheetBadgeClassName(t.status)}>
                              {t.status}
                            </Badge>
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold">Other Timesheets</p>
                </div>
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
                    {otherFilteredTimesheets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.consultantName}</TableCell>
                        <TableCell className="text-xs">
                          {t.projectName || t.projectCode || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.weekStart} → {t.weekEnd}
                        </TableCell>
                        <TableCell className="text-right">{t.totalHours}</TableCell>
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
                    {filteredTimesheets.length > 0 && otherFilteredTimesheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No other timesheets in this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
        </div>

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