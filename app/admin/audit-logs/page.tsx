import { adminService } from "@/services";
import { Suspense } from "react";
import { actionTypeFilters } from "../mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

const actionLabelMap: Record<string, string> = {
  "admin.user.create": "Admin created user",
  "admin.user.reset_password": "Admin reset user password",
  "admin.user.activate": "Admin activated user",
  "admin.user.deactivate": "Admin deactivated user",
  "admin.project.create": "Admin created project",
  "admin.project.activate": "Admin activated project",
  "admin.project.deactivate": "Admin deactivated project",
  "admin.project.assign_consultant": "Admin assigned consultant to project",
  "admin.project.remove_consultant": "Admin removed consultant from project",
  "manager.timesheet.approve": "Manager approved timesheet",
  "manager.timesheet.reject": "Manager rejected timesheet",
  "manager.leave_request.approve": "Manager approved leave request",
  "manager.leave_request.reject": "Manager rejected leave request",
  "finance.timesheet.mark_processed": "Finance marked timesheet as processed",
  "consultant.timesheet.save_draft": "Consultant saved timesheet draft",
  "consultant.timesheet.submit": "Consultant submitted timesheet",
  "consultant.timesheet.delete_draft": "Consultant deleted timesheet draft",
};

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionLabel(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  if (action === "consultant.timesheet.submit") {
    const status = typeof metadata?.status === "string" ? metadata.status : "";
    if (status === "submitted_late") {
      return "Consultant submitted timesheet late";
    }
  }

  const mapped = actionLabelMap[action];
  if (mapped) return mapped;

  const normalized = action.replace(/[._]+/g, " ").trim();
  return normalized.length > 0 ? toTitleCase(normalized) : "Unknown action";
}

type AuditLogFilters = {
  searchText: string;
  fromDate: string;
  toDate: string;
  actionType: string;
};

function matchesActionTypeFilter(action: string, selectedActionType: string): boolean {
  if (selectedActionType === actionTypeFilters[0]) {
    return true;
  }

  switch (selectedActionType) {
    case "Account Changes":
      return action.startsWith("admin.user.");
    case "Project Changes":
      return action.startsWith("admin.project.");
    case "Role Assignments":
      return action === "admin.project.assign_consultant" || action === "admin.project.remove_consultant";
    case "Timesheet Submission":
      return action === "consultant.timesheet.submit";
    case "Timesheet Approval":
      return action === "manager.timesheet.approve";
    case "Timesheet Rejection":
      return action === "manager.timesheet.reject";
    case "Timesheet Export":
      return action === "consultant.timesheet.save_draft";
    case "Finance Processing":
      return action === "finance.timesheet.mark_processed";
    default:
      return true;
  }
}

function normalizeDateInput(value?: string): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function resolveFilters(searchParams?: Record<string, string | string[] | undefined>): AuditLogFilters {
  const searchTextRaw = searchParams?.searchText;
  const fromDateRaw = searchParams?.fromDate;
  const toDateRaw = searchParams?.toDate;
  const actionTypeRaw = searchParams?.actionType;
  const searchText = (Array.isArray(searchTextRaw) ? searchTextRaw[0] : searchTextRaw ?? "").trim();
  const fromDate = normalizeDateInput(Array.isArray(fromDateRaw) ? fromDateRaw[0] : fromDateRaw);
  const toDate = normalizeDateInput(Array.isArray(toDateRaw) ? toDateRaw[0] : toDateRaw);
  const requestedActionType = (Array.isArray(actionTypeRaw) ? actionTypeRaw[0] : actionTypeRaw ?? "").trim();
  const actionType =
    requestedActionType.length > 0 && actionTypeFilters.includes(requestedActionType)
      ? requestedActionType
      : actionTypeFilters[0];

  return {
    searchText,
    fromDate,
    toDate,
    actionType,
  };
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filters = resolveFilters(resolvedSearchParams);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Full activity history with filters by user, date range, and action
            type.
          </CardDescription>
        </div>
        <Button type="button" variant="secondary" disabled title="Export is not available yet">
          Export Logs (Soon)
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <form method="get" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="audit-actor-search">Actor</Label>
              <Input
                id="audit-actor-search"
                name="searchText"
                type="text"
                placeholder="Search by actor name or email"
                defaultValue={filters.searchText}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="audit-date-from">From</Label>
              <Input
                id="audit-date-from"
                name="fromDate"
                type="date"
                defaultValue={filters.fromDate}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="audit-date-to">To</Label>
              <Input
                id="audit-date-to"
                name="toDate"
                type="date"
                defaultValue={filters.toDate}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="audit-action-type">Action Type</Label>
              <select
                id="audit-action-type"
                name="actionType"
                defaultValue={filters.actionType}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {actionTypeFilters.map((actionType) => (
                  <option key={actionType} value={actionType}>
                    {actionType}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm">
              Apply Filters
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <a href="/admin/audit-logs">Reset</a>
            </Button>
          </div>
        </form>
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-200">
          Export is not available yet. Use filters to narrow the on-screen audit
          history.
        </p>

        <Suspense fallback={<AuditLogsTableLoading />}>
          <AuditLogsTableSection filters={filters} />
        </Suspense>

        <p className="rounded-md border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-900 dark:text-sky-200">
          Captured events include account and project changes, role assignments,
          timesheet submissions/approvals/rejections/exports, and finance
          processing timestamps (including late processing markers).
        </p>
      </CardContent>
    </Card>
  );
}

function AuditLogsTableLoading() {
  return (
    <div className="rounded-md border p-6 text-sm text-muted-foreground">
      Loading audit logs...
    </div>
  );
}

async function AuditLogsTableSection({ filters }: { filters: AuditLogFilters }) {
  let rows: Awaited<ReturnType<typeof adminService.listAuditLogs>> = [];
  let loadError: string | null = null;

  try {
    rows = await adminService.listAuditLogs({
      search_text: filters.searchText || null,
      from_date: filters.fromDate || null,
      to_date: filters.toDate || null,
      action_filter: null,
      limit_count: 200,
    });
    rows = rows.filter((row) => matchesActionTypeFilter(row.action, filters.actionType));
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load audit logs";
  }

  return (
    <>
      {loadError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / System</TableHead>
              <TableHead>Action Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold">{row.actor_name}</TableCell>
                  <TableCell>{formatActionLabel(row.action, row.metadata)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.entity_type}
                    {row.entity_id ? ` (${row.entity_id})` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimestamp(row.occurred_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.metadata ? JSON.stringify(row.metadata) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
