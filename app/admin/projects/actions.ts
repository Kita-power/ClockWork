"use server";

import { revalidatePath } from "next/cache";
import { adminService } from "@/services";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type LoadConsultantsResult =
  | {
      ok: true;
      consultants: {
        id: string;
        full_name: string;
        email: string;
        is_active: boolean;
        assigned_at: string;
      }[];
    }
  | {
      ok: false;
      error: string;
      consultants: [];
    };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

export async function createAdminProjectAction(input: {
  name: string;
  code: string;
  consultantIds?: string[];
}): Promise<ActionResult> {
  try {
    await adminService.createProject({
      name: input.name,
      code: input.code,
      consultantIds: input.consultantIds ?? [],
    });
    await logAuditSuccess({
      action: "admin.project.create",
      entityType: "project",
      metadata: {
        code: input.code.trim(),
        name: input.name.trim(),
        consultantIds: input.consultantIds ?? [],
      },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/admin/audit-logs");
    return { ok: true };
  } catch (error) {
    await logAuditFailure({
      action: "admin.project.create",
      entityType: "project",
      metadata: { code: input.code.trim(), name: input.name.trim() },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function setAdminProjectActiveAction(input: {
  projectId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await adminService.setProjectActive(input.projectId, input.isActive);
    await logAuditSuccess({
      action: input.isActive ? "admin.project.activate" : "admin.project.deactivate",
      entityType: "project",
      entityId: input.projectId,
      metadata: { isActive: input.isActive },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/admin/audit-logs");
    return { ok: true };
  } catch (error) {
    await logAuditFailure({
      action: input.isActive ? "admin.project.activate" : "admin.project.deactivate",
      entityType: "project",
      entityId: input.projectId,
      metadata: { isActive: input.isActive },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function assignConsultantToProjectAction(input: {
  projectId: string;
  consultantId: string;
}): Promise<ActionResult> {
  try {
    await adminService.assignConsultantToProject(
      input.projectId,
      input.consultantId,
    );
    await logAuditSuccess({
      action: "admin.project.assign_consultant",
      entityType: "project_assignment",
      entityId: input.projectId,
      metadata: {
        projectId: input.projectId,
        consultantId: input.consultantId,
      },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/admin/audit-logs");
    return { ok: true };
  } catch (error) {
    await logAuditFailure({
      action: "admin.project.assign_consultant",
      entityType: "project_assignment",
      entityId: input.projectId,
      metadata: {
        projectId: input.projectId,
        consultantId: input.consultantId,
      },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function listProjectConsultantsAction(
  projectId: string,
): Promise<LoadConsultantsResult> {
  try {
    const consultants = await adminService.listProjectConsultants(projectId);
    return { ok: true, consultants };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error), consultants: [] };
  }
}

export async function removeConsultantFromProjectAction(input: {
  projectId: string;
  consultantId: string;
}): Promise<ActionResult> {
  try {
    await adminService.removeConsultantFromProject(
      input.projectId,
      input.consultantId,
    );
    await logAuditSuccess({
      action: "admin.project.remove_consultant",
      entityType: "project_assignment",
      entityId: input.projectId,
      metadata: {
        projectId: input.projectId,
        consultantId: input.consultantId,
      },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/admin/audit-logs");
    return { ok: true };
  } catch (error) {
    await logAuditFailure({
      action: "admin.project.remove_consultant",
      entityType: "project_assignment",
      entityId: input.projectId,
      metadata: {
        projectId: input.projectId,
        consultantId: input.consultantId,
      },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}
