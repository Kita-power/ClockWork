"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignConsultantToProjectAction,
  createAdminProjectAction,
  listProjectConsultantsAction,
  removeConsultantFromProjectAction,
  setAdminProjectActiveAction,
} from "./actions";
import { useUser } from "@/hooks/use-user";

type AdminProject = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  consultant_count: number;
};

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: "consultant" | "manager" | "finance" | "admin";
  is_active: boolean;
};

type AssignedConsultant = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  assigned_at: string;
};

function generateRandomProjectId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `PRJ-${suffix}`;
}

export function AdminProjectsClient({
  projects,
  users,
  initialError,
}: {
  projects: AdminProject[];
  users: AdminUser[];
  initialError: string | null;
}) {
  const router = useRouter();
  const currentUser = useUser();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectConsultantIds, setNewProjectConsultantIds] = useState<string[]>(
    [],
  );
  const [newProjectCode, setNewProjectCode] = useState("");
  const addProjectFormRef = useRef<HTMLFormElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState("");
  const [assignedConsultants, setAssignedConsultants] = useState<
    AssignedConsultant[]
  >([]);
  const [isLoadingConsultants, setIsLoadingConsultants] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const filteredProjects = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !normalized ||
        project.name.toLowerCase().includes(normalized) ||
        project.code.toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "Active" ? project.is_active : !project.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const consultantOptions = useMemo(
    () => users.filter((user) => user.role === "consultant" && user.is_active),
    [users],
  );

  useEffect(() => {
    setSelectedConsultantId("");
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setAssignedConsultants([]);
      return;
    }

    let isMounted = true;
    setIsLoadingConsultants(true);
    setErrorMessage(null);

    listProjectConsultantsAction(selectedProjectId).then((result) => {
      if (!isMounted) return;
      if (!result.ok) {
        setAssignedConsultants([]);
        setErrorMessage(result.error);
      } else {
        setAssignedConsultants(result.consultants);
      }
      setIsLoadingConsultants(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  function toggleNewProjectConsultant(consultantId: string) {
    setNewProjectConsultantIds((prev) =>
      prev.includes(consultantId)
        ? prev.filter((id) => id !== consultantId)
        : [...prev, consultantId],
    );
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Project Management</CardTitle>
          <CardDescription>
            Create projects, update status, and review staffing counts.
          </CardDescription>
        </div>
        <Button
          type="button"
          disabled={!currentUser.isAdmin}
          title={!currentUser.isAdmin ? "Only active admins can add projects" : undefined}
          onClick={() => setIsAddProjectDialogOpen(true)}
        >
          Add Project
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {!currentUser.isLoading && !currentUser.isAuthenticated ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            You are not logged in. Please log in to use admin actions.
          </p>
        ) : null}
        {!currentUser.isLoading &&
        currentUser.isAuthenticated &&
        !currentUser.isAdmin ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            Your account is not an active admin. Project mutations are disabled.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="projects-search">Search Projects</Label>
            <Input
              id="projects-search"
              type="search"
              placeholder="Search by project name or code"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="projects-status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="projects-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="All statuses">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Deactivated">Deactivated</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Assigned Consultants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-semibold">{project.name}</TableCell>
                  <TableCell className="font-mono text-xs">{project.code}</TableCell>
                  <TableCell>{project.consultant_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant={project.is_active ? "secondary" : "outline"}
                      className={
                        project.is_active
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      }
                    >
                      {project.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No projects found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Sheet
        open={Boolean(selectedProject)}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Project Details</SheetTitle>
            <SheetDescription>
              Review project information and run admin actions.
            </SheetDescription>
          </SheetHeader>

          {selectedProject ? (
            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {selectedProject.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedProject.code}
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Assigned Consultants
                  </p>
                  <p className="mt-1 font-semibold">{selectedProject.consultant_count}</p>
                  <div className="mt-3 space-y-2">
                    {isLoadingConsultants ? (
                      <p className="text-sm text-muted-foreground">Loading consultants…</p>
                    ) : assignedConsultants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No consultants assigned yet.
                      </p>
                    ) : (
                      assignedConsultants.map((consultant) => (
                        <div
                          key={consultant.id}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{consultant.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {consultant.email}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || !currentUser.isAdmin}
                            onClick={() => {
                              setErrorMessage(null);
                              startTransition(async () => {
                                const result = await removeConsultantFromProjectAction({
                                  projectId: selectedProject.id,
                                  consultantId: consultant.id,
                                });
                                if (!result.ok) {
                                  setErrorMessage(result.error);
                                  return;
                                }
                                const consultantsResult =
                                  await listProjectConsultantsAction(selectedProject.id);
                                if (consultantsResult.ok) {
                                  setAssignedConsultants(consultantsResult.consultants);
                                }
                                router.refresh();
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <Badge variant={selectedProject.is_active ? "secondary" : "outline"}>
                      {selectedProject.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Assignment and Status</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Assign consultant
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedConsultantId}
                        onValueChange={setSelectedConsultantId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select consultant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {consultantOptions.map((consultant) => (
                              <SelectItem key={consultant.id} value={consultant.id}>
                                {consultant.full_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          isPending || !currentUser.isAdmin || !selectedConsultantId
                        }
                        onClick={() => {
                          setErrorMessage(null);
                          startTransition(async () => {
                            const result = await assignConsultantToProjectAction({
                              projectId: selectedProject.id,
                              consultantId: selectedConsultantId,
                            });
                            if (!result.ok) {
                              setErrorMessage(result.error);
                              return;
                            }
                            setSelectedConsultantId("");
                            const consultantsResult =
                              await listProjectConsultantsAction(selectedProject.id);
                            if (consultantsResult.ok) {
                              setAssignedConsultants(consultantsResult.consultants);
                            }
                            router.refresh();
                          });
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>

                  {!currentUser.isAdmin ? (
                    <p className="text-xs text-muted-foreground">
                      Only active admins can change project status.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      </Card>

      <Dialog
        open={isAddProjectDialogOpen}
        onOpenChange={(open) => {
          setIsAddProjectDialogOpen(open);
          if (!open) {
            addProjectFormRef.current?.reset();
            setNewProjectConsultantIds([]);
            setNewProjectCode("");
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-4 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Create a project and optionally assign consultants immediately.
            </DialogDescription>
          </DialogHeader>

          <form
            ref={addProjectFormRef}
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setErrorMessage(null);
              const formData = new FormData(event.currentTarget);
              const name = String(formData.get("name") ?? "");
              const code = String(formData.get("code") ?? "");
              startTransition(async () => {
                const result = await createAdminProjectAction({
                  name,
                  code,
                  consultantIds: newProjectConsultantIds,
                });
                if (!result.ok) {
                  setErrorMessage(result.error);
                  return;
                }
                setIsAddProjectDialogOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                name="name"
                type="text"
                placeholder="e.g. Northbridge rollout"
                required
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-code">Unique identifier</Label>
              <div className="flex gap-2">
                <Input
                  id="project-code"
                  name="code"
                  type="text"
                  className="min-w-0 flex-1"
                  value={newProjectCode}
                  onChange={(event) => setNewProjectCode(event.target.value)}
                  placeholder="e.g. NBR-2026"
                  required
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={isPending}
                  onClick={() => setNewProjectCode(generateRandomProjectId())}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <Label>Assign consultants</Label>
              <p className="text-sm text-muted-foreground">
                Active consultants only. You can change assignments later from project
                details.
              </p>
              <div
                className="h-[min(45vh,320px)] min-h-[10rem] overflow-y-auto overscroll-y-contain rounded-md border bg-muted/20 p-2 scrollbar-gutter-stable"
              >
                {consultantOptions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No active consultants yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 pr-1">
                    {consultantOptions.map((consultant) => (
                      <li key={consultant.id}>
                        <label
                          htmlFor={`new-project-consultant-${consultant.id}`}
                          className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`new-project-consultant-${consultant.id}`}
                            checked={newProjectConsultantIds.includes(consultant.id)}
                            onCheckedChange={() =>
                              toggleNewProjectConsultant(consultant.id)
                            }
                            disabled={isPending}
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-sm font-medium leading-none">
                              {consultant.full_name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {consultant.email}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !currentUser.isAdmin}>
                Create Project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
