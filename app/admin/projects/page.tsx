import { adminService } from "@/services";
import { AdminProjectsClient } from "./projects-client";

export default async function AdminProjectsPage() {
  try {
    const [projects, users] = await Promise.all([
      adminService.listProjects(),
      adminService.listUsers(),
    ]);
    return <AdminProjectsClient projects={projects} users={users} initialError={null} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load projects";
    return <AdminProjectsClient projects={[]} users={[]} initialError={message} />;
  }
}
