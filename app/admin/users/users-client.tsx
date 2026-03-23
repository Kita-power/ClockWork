"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  createAdminUserAction,
  setAdminUserActiveAction,
  updateAdminUserRoleAction,
} from "./actions";
import { useUser } from "@/hooks/use-user";

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: "consultant" | "manager" | "finance" | "admin";
  manager_id: string | null;
  is_active: boolean;
  must_reset_password: boolean;
  assigned_projects_count: number;
};

const roleOptions = ["consultant", "manager", "finance", "admin"] as const;

function toUiRole(role: AdminUser["role"]): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    case "finance":
      return "Finance";
    default:
      return "Consultant";
  }
}

function roleToInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminUsersClient({
  users,
  initialError,
}: {
  users: AdminUser[];
  initialError: string | null;
}) {
  const router = useRouter();
  const currentUser = useUser();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState<(typeof roleOptions)[number]>(
    "consultant",
  );
  const [newUserManagerId, setNewUserManagerId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const allRoles = useMemo(
    () => ["All roles", ...new Set(users.map((user) => toUiRole(user.role)))],
    [users],
  );

  const allStatuses = ["All statuses", "Active", "Deactivated"];
  const managerOptions = useMemo(
    () => users.filter((user) => user.role === "manager" && user.is_active),
    [users],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        user.full_name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole =
        roleFilter === "All roles" || toUiRole(user.role) === roleFilter;
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "Active" ? user.is_active : !user.is_active);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    if (newUserRole !== "consultant") {
      setNewUserManagerId("");
    }
  }, [newUserRole]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Browse users, search quickly, and filter by role or account status.
            </CardDescription>
          </div>
          <Button
            type="button"
            disabled={!currentUser.isAdmin}
            onClick={() => {
              setNewUserCredentials(null);
              setIsAddUserDialogOpen(true);
            }}
          >
            Add User
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
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
              Your account is not an active admin. Admin actions are disabled.
            </p>
          ) : null}
          {newUserCredentials ? (
            <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                User created in Supabase Auth.
              </p>
              <p className="mt-1 text-muted-foreground">
                Login email: {newUserCredentials.email}
              </p>
              <p className="font-mono">
                Temporary password: {newUserCredentials.temporaryPassword}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              type="search"
              placeholder="Search by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {allRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {allStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <ul>
              {filteredUsers.map((user) => (
                <li key={user.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{roleToInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{toUiRole(user.role)}</Badge>
                        <Badge variant={user.is_active ? "secondary" : "destructive"}>
                          {user.is_active ? "Active" : "Deactivated"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filteredUsers.length === 0 && (
                <li className="px-4 py-6 text-muted-foreground">
                  No users matched your search and filters.
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>Review account details and admin actions.</SheetDescription>
          </SheetHeader>

          {selectedUser ? (
            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {selectedUser.full_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="mt-1 font-semibold">{toUiRole(selectedUser.role)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Assigned Projects</p>
                  <p className="mt-1 font-semibold">{selectedUser.assigned_projects_count}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {roleOptions.map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant="outline"
                      disabled={isPending || !currentUser.isAdmin}
                      onClick={() => {
                        setErrorMessage(null);
                        startTransition(async () => {
                          const result = await updateAdminUserRoleAction({
                            userId: selectedUser.id,
                            role,
                          });
                          if (!result.ok) {
                            setErrorMessage(result.error);
                            return;
                          }
                          router.refresh();
                        });
                      }}
                    >
                      Set {toUiRole(role)}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant={selectedUser.is_active ? "destructive" : "secondary"}
                    disabled={isPending || !currentUser.isAdmin}
                    onClick={() => {
                      setErrorMessage(null);
                      startTransition(async () => {
                        const result = await setAdminUserActiveAction({
                          userId: selectedUser.id,
                          isActive: !selectedUser.is_active,
                        });
                        if (!result.ok) {
                          setErrorMessage(result.error);
                          return;
                        }
                        router.refresh();
                      });
                    }}
                  >
                    {selectedUser.is_active ? "Deactivate User" : "Reactivate User"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Creates a Supabase Auth account and returns a temporary password.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setErrorMessage(null);
              const formData = new FormData(event.currentTarget);
              const fullName = String(formData.get("fullName") ?? "");
              const email = String(formData.get("email") ?? "");
              startTransition(async () => {
                if (newUserRole === "consultant" && !newUserManagerId) {
                  setErrorMessage("Consultant users must have a manager");
                  return;
                }

                const result = await createAdminUserAction({
                  fullName,
                  email,
                  role: newUserRole,
                  managerId: newUserRole === "consultant" ? newUserManagerId : null,
                });
                if (!result.ok) {
                  setErrorMessage(result.error);
                  return;
                }
                if (result.temporaryPassword) {
                  setNewUserCredentials({
                    email,
                    temporaryPassword: result.temporaryPassword,
                  });
                }
                setIsAddUserDialogOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" type="text" placeholder="Amelia Rogers" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="name@clockwork.io" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as typeof roleOptions[number])}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {newUserRole === "consultant" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="manager">Manager</Label>
                <Select value={newUserManagerId} onValueChange={setNewUserManagerId}>
                  <SelectTrigger id="manager">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {managerOptions.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !currentUser.isAdmin}>
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
