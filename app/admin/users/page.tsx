"use client";

import { useMemo, useState } from "react";
import { managedUsers } from "../mock-data";
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

const allRoles = ["All roles", ...new Set(managedUsers.map((user) => user.role))];
const allStatuses = [
  "All statuses",
  ...new Set(managedUsers.map((user) => user.status)),
];

const assignedProjectsByEmail: Record<string, string[]> = {
  "leah.chen@clockwork.io": ["Morrison ERP Controls"],
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return managedUsers.filter((user) => {
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "All roles" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "All statuses" || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter]);

  const selectedUser =
    managedUsers.find((user) => user.email === selectedUserEmail) ?? null;

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
          <Button type="button" onClick={() => setIsAddUserDialogOpen(true)}>
            Add User
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
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
                <li key={user.email} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUserEmail(user.email)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge variant={user.status === "Active" ? "secondary" : "destructive"}>
                          {user.status}
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
          if (!open) {
            setSelectedUserEmail(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>Review account details and quick actions.</SheetDescription>
          </SheetHeader>

          {selectedUser ? (
            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="mt-1 font-semibold">{selectedUser.role}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <Badge
                    className="mt-2"
                    variant={selectedUser.status === "Active" ? "secondary" : "destructive"}
                  >
                    {selectedUser.status}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline">
                    Edit Profile
                  </Button>
                  <Button type="button" variant="outline">
                    Reset Password
                  </Button>
                  <Button type="button" variant="outline">
                    Change Role
                  </Button>
                  <Button type="button" variant="destructive">
                    Deactivate User
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Manage Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser.role === "Consultant" ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        Review current project assignments for this consultant.
                      </p>
                      {(assignedProjectsByEmail[selectedUser.email] ?? []).map((project) => (
                        <div key={project} className="rounded-md border p-2 text-sm">
                          {project}
                        </div>
                      ))}
                      {(assignedProjectsByEmail[selectedUser.email] ?? []).length === 0 && (
                        <div className="rounded-md border p-2 text-sm text-muted-foreground">
                          No projects assigned.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Only consultants can be assigned to projects.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Select a user to view details.
            </p>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new account and assign a role.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setIsAddUserDialogOpen(false);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" type="text" placeholder="Amelia Rogers" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@clockwork.io" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <Select defaultValue="Consultant">
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Consultant">Consultant</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
