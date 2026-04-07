import { adminService } from "@/services";
import { Suspense } from "react";
import { actionTypeFilters } from "../mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function AdminAuditLogsPage() {
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
        <Button type="button" variant="secondary">
          Export Logs
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input type="text" placeholder="Filter by user" />
          <Input type="date" />
          <Input type="date" />
          <Select defaultValue={actionTypeFilters[0]}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {actionTypeFilters.map((actionType) => (
                  <SelectItem key={actionType} value={actionType}>
                    {actionType}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Suspense fallback={<AuditLogsTableLoading />}>
          <AuditLogsTableSection />
        </Suspense>

        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
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

async function AuditLogsTableSection() {
  let rows: Awaited<ReturnType<typeof adminService.listAuditLogs>> = [];
  let loadError: string | null = null;

  try {
    rows = await adminService.listAuditLogs({ limit_count: 200 });
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
