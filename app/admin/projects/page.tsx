import { projects } from "../mock-data";
import { Badge } from "@/components/ui/badge";
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

export default function AdminProjectsPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Project Management</CardTitle>
          <CardDescription>
            Create projects, define tasks, edit project details, deactivate
            projects, and assign managers/consultants.
          </CardDescription>
        </div>
        <Button type="button">Create Project</Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <Input type="text" placeholder="Project name" />
          <Input type="text" placeholder="Unique project identifier" />
          <Input type="text" placeholder="Define tasks (comma-separated)" />
          <Select defaultValue="default">
            <SelectTrigger>
              <SelectValue placeholder="Assign managers + consultants" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="default">Assign managers + consultants</SelectItem>
                <SelectItem value="2x5">2 managers / 5 consultants</SelectItem>
                <SelectItem value="1x3">1 manager / 3 consultants</SelectItem>
                <SelectItem value="3x8">3 managers / 8 consultants</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.identifier}>
                  <TableCell className="font-semibold">{project.name}</TableCell>
                  <TableCell className="font-mono text-xs">{project.identifier}</TableCell>
                  <TableCell>{project.tasks}</TableCell>
                  <TableCell className="text-muted-foreground">{project.assigned}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === "Active" ? "secondary" : "outline"}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button type="button" variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button type="button" variant="destructive" size="sm">
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
