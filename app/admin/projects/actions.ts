"use server";

import { revalidatePath } from "next/cache";
import { adminService } from "@/services";

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
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function setAdminProjectActiveAction(input: {
  projectId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await adminService.setProjectActive(input.projectId, input.isActive);
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (error) {
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
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (error) {
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
    revalidatePath("/admin/projects");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
