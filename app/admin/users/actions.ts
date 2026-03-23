"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { adminService } from "@/services";

type ActionResult =
  | { ok: true; temporaryPassword?: string }
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

    revalidatePath("/admin/users");
    return { ok: true, temporaryPassword };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function updateAdminUserRoleAction(input: {
  userId: string;
  role: string;
}): Promise<ActionResult> {
  try {
    await adminService.updateUserRole(input.userId, input.role);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function setAdminUserActiveAction(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await adminService.setUserActive(input.userId, input.isActive);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
