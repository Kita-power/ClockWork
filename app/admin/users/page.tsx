import { adminService } from "@/services";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  try {
    const users = await adminService.listUsers();
    return <AdminUsersClient users={users} initialError={null} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load users";
    return <AdminUsersClient users={[]} initialError={message} />;
  }
}
