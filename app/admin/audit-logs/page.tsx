import { adminService } from "@/services";
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

export default async function AdminAuditLogsPage() {
  let rows: Awaited<ReturnType<typeof adminService.listAuditLogs>> = [];
  let loadError: string | null = null;

  try {
    rows = await adminService.listAuditLogs({ limit_count: 200 });
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load audit logs";
  }

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
        {loadError ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

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
                    <TableCell>{row.action}</TableCell>
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

        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Captured events include account and project changes, role assignments,
          timesheet submissions/approvals/rejections/exports, and finance
          processing timestamps (including late processing markers).
        </p>
      </CardContent>
    </Card>
  );
}
