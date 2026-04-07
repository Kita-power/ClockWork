"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { adminService } from "@/services";
import { logAuditFailure, logAuditSuccess } from "@/lib/audit-log";

type ActionResult =
  | { ok: true; temporaryPassword?: string; email?: string }
  | {
      ok: false;
      error: string;
    };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function createAdminAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin user creation",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function generateTemporaryPassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function createAdminUserAction(input: {
  email: string;
  fullName: string;
  role: string;
  managerId?: string | null;
}): Promise<ActionResult> {
  try {
    if (input.role.trim().toLowerCase() === "consultant" && !input.managerId) {
      throw new Error("Consultant users must have a manager");
    }

    const temporaryPassword = generateTemporaryPassword();
    const authAdmin = createAdminAuthClient();

    const { data: createdAuthUser, error: authError } =
      await authAdmin.auth.admin.createUser({
        email: input.email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName.trim(),
          role: input.role.trim().toLowerCase(),
          manager_id:
            input.role.trim().toLowerCase() === "consultant"
              ? input.managerId ?? null
              : null,
        },
      });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!createdAuthUser.user) {
      throw new Error("Failed to create auth user");
    }

    await logAuditSuccess({
      action: "admin.user.create",
      entityType: "user",
      entityId: createdAuthUser.user.id,
      metadata: {
        targetEmail: input.email.trim().toLowerCase(),
        targetRole: input.role.trim().toLowerCase(),
        managerId: input.managerId ?? null,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/audit-logs");
    return { ok: true, temporaryPassword };
  } catch (error) {
    await logAuditFailure({
      action: "admin.user.create",
      entityType: "user",
      metadata: {
        targetEmail: input.email.trim().toLowerCase(),
        targetRole: input.role.trim().toLowerCase(),
      },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function resetAdminUserPasswordAction(input: {
  userId: string;
}): Promise<ActionResult> {
  try {
    const temporaryPassword = generateTemporaryPassword();
    const authAdmin = createAdminAuthClient();

    const { data, error } = await authAdmin.auth.admin.updateUserById(
      input.userId,
      { password: temporaryPassword },
    );

    if (error) {
      throw new Error(error.message);
    }

    const email = data.user?.email;
    if (!email) {
      throw new Error("Could not read user email after password update");
    }

    await logAuditSuccess({
      action: "admin.user.reset_password",
      entityType: "user",
      entityId: input.userId,
      metadata: { targetEmail: email },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/audit-logs");
    return { ok: true, temporaryPassword, email };
  } catch (error) {
    await logAuditFailure({
      action: "admin.user.reset_password",
      entityType: "user",
      entityId: input.userId,
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function setAdminUserActiveAction(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await adminService.setUserActive(input.userId, input.isActive);
    await logAuditSuccess({
      action: input.isActive ? "admin.user.activate" : "admin.user.deactivate",
      entityType: "user",
      entityId: input.userId,
      metadata: { isActive: input.isActive },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/audit-logs");
    return { ok: true };
  } catch (error) {
    await logAuditFailure({
      action: input.isActive ? "admin.user.activate" : "admin.user.deactivate",
      entityType: "user",
      entityId: input.userId,
      metadata: { isActive: input.isActive },
      error,
    });
    return { ok: false, error: getErrorMessage(error) };
  }
}
