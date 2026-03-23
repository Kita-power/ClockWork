import "server-only";

import { createClient } from "@/lib/supabase/server";

type DbUserRole = "consultant" | "manager" | "finance" | "admin";

export type AdminUserRecord = {
  id: string;
  full_name: string;
  email: string;
  role: DbUserRole;
  manager_id: string | null;
  is_active: boolean;
  must_reset_password: boolean;
  assigned_projects_count: number;
  created_at: string;
  updated_at: string | null;
};

export type AdminProjectRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_by: string;
  consultant_count: number;
  created_at: string;
  updated_at: string | null;
};

export type AdminAuditLogRecord = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  is_late: boolean | null;
  occurred_at: string;
};

export type AdminProjectConsultantRecord = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  assigned_at: string;
};

type RpcListUsersArgs = {
  search_text?: string | null;
  role_filter?: string | null;
  is_active_filter?: boolean | null;
};

type RpcListProjectsArgs = {
  search_text?: string | null;
  is_active_filter?: boolean | null;
};

type RpcListAuditLogsArgs = {
  search_text?: string | null;
  action_filter?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  limit_count?: number;
};

function normalizeRoleForDb(role: string): DbUserRole {
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin" || normalized === "administrator") return "admin";
  if (normalized === "manager") return "manager";
  if (normalized === "finance") return "finance";
  return "consultant";
}

export function mapRoleToUi(role: DbUserRole): string {
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

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export const adminService = {
  async listUsers(filters: RpcListUsersArgs = {}): Promise<AdminUserRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_users", {
      search_text: filters.search_text ?? null,
      role_filter: filters.role_filter
        ? normalizeRoleForDb(filters.role_filter)
        : null,
      is_active_filter: filters.is_active_filter ?? null,
    });

    if (error) throw new Error(error.message);
    return ensureArray<AdminUserRecord>(data);
  },

  async createUser(input: {
    email: string;
    fullName: string;
    role: string;
    managerId?: string | null;
  }): Promise<AdminUserRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_create_user", {
      user_email: input.email.trim().toLowerCase(),
      user_full_name: input.fullName.trim(),
      user_role: normalizeRoleForDb(input.role),
      user_manager_id: input.managerId ?? null,
    });

    if (error) throw new Error(error.message);
    return data as AdminUserRecord;
  },

  async updateUserRole(userId: string, role: string): Promise<AdminUserRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_update_user_role", {
      p_user_id: userId,
      p_role: normalizeRoleForDb(role),
    });

    if (error) throw new Error(error.message);
    return data as AdminUserRecord;
  },

  async setUserActive(userId: string, isActive: boolean): Promise<AdminUserRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_set_user_active", {
      p_user_id: userId,
      p_is_active: isActive,
    });

    if (error) throw new Error(error.message);
    return data as AdminUserRecord;
  },

  async listProjects(
    filters: RpcListProjectsArgs = {},
  ): Promise<AdminProjectRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_projects", {
      search_text: filters.search_text ?? null,
      is_active_filter: filters.is_active_filter ?? null,
    });

    if (error) throw new Error(error.message);
    return ensureArray<AdminProjectRecord>(data);
  },

  async createProject(input: {
    name: string;
    code: string;
    consultantIds?: string[];
  }): Promise<AdminProjectRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_create_project", {
      p_name: input.name.trim(),
      p_code: input.code.trim(),
      p_consultant_ids: input.consultantIds ?? [],
    });

    if (error) throw new Error(error.message);
    return data as AdminProjectRecord;
  },

  async setProjectActive(
    projectId: string,
    isActive: boolean,
  ): Promise<AdminProjectRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_set_project_active", {
      p_project_id: projectId,
      p_is_active: isActive,
    });

    if (error) throw new Error(error.message);
    return data as AdminProjectRecord;
  },

  async assignConsultantToProject(
    projectId: string,
    consultantId: string,
  ): Promise<AdminProjectRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_assign_consultant_to_project", {
      p_project_id: projectId,
      p_consultant_id: consultantId,
    });

    if (error) throw new Error(error.message);
    return data as AdminProjectRecord;
  },

  async listProjectConsultants(
    projectId: string,
  ): Promise<AdminProjectConsultantRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_project_consultants", {
      p_project_id: projectId,
    });

    if (error) throw new Error(error.message);
    return ensureArray<AdminProjectConsultantRecord>(data);
  },

  async removeConsultantFromProject(
    projectId: string,
    consultantId: string,
  ): Promise<AdminProjectRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_remove_consultant_from_project", {
      p_project_id: projectId,
      p_consultant_id: consultantId,
    });

    if (error) throw new Error(error.message);
    return data as AdminProjectRecord;
  },

  async listAuditLogs(
    filters: RpcListAuditLogsArgs = {},
  ): Promise<AdminAuditLogRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_audit_logs", {
      search_text: filters.search_text ?? null,
      action_filter: filters.action_filter ?? null,
      from_date: filters.from_date ?? null,
      to_date: filters.to_date ?? null,
      limit_count: filters.limit_count ?? 100,
    });

    if (error) throw new Error(error.message);
    return ensureArray<AdminAuditLogRecord>(data);
  },
};
