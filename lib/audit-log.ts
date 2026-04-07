import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

type UserRole = "admin" | "manager" | "finance" | "consultant";
type AuditOutcome = "success" | "failure";

type AuditMetadata = Record<string, unknown>;

export type AuditActorContext = {
  actorId: string | null;
  actorRole: UserRole | "unknown";
};

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  outcome: AuditOutcome;
  metadata?: AuditMetadata;
  actorId?: string | null;
  actorRole?: UserRole | "unknown";
};

function isKnownRole(value: string): value is UserRole {
  return value === "admin" || value === "manager" || value === "finance" || value === "consultant";
}

function toErrorMetadata(error: unknown): AuditMetadata {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }
  return { errorMessage: "Unknown error" };
}

export async function getAuditActorContext(): Promise<AuditActorContext> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const actorId = data.user?.id ?? null;

  if (!actorId) {
    return { actorId: null, actorRole: "unknown" };
  }

  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", actorId)
    .maybeSingle<{ role: string }>();

  const actorRole = isKnownRole(roleRow?.role ?? "") ? roleRow.role : "unknown";
  return { actorId, actorRole };
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const context = await getAuditActorContext();
    const supabase = await createClient();
    const requestId = randomUUID();

    const metadata: AuditMetadata = {
      requestId,
      outcome: input.outcome,
      actorRole: input.actorRole ?? context.actorRole,
      ...(input.metadata ?? {}),
    };

    const { error } = await supabase.from("audit_log").insert({
      actor_id: input.actorId ?? context.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to write audit log", error.message);
    }
  } catch (error) {
    console.error("Unexpected audit logging error", error);
  }
}

export async function logAuditSuccess(
  input: Omit<AuditEventInput, "outcome">,
): Promise<void> {
  await logAuditEvent({ ...input, outcome: "success" });
}

export async function logAuditFailure(
  input: Omit<AuditEventInput, "outcome"> & { error: unknown },
): Promise<void> {
  const { error, ...rest } = input;
  await logAuditEvent({
    ...rest,
    outcome: "failure",
    metadata: {
      ...(rest.metadata ?? {}),
      ...toErrorMetadata(error),
    },
  });
}
