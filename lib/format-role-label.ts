/** Maps `users.role` from Supabase to a short UI label. */
export function formatRoleLabel(role: string | null): string {
  if (!role) return "Unknown";
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    case "finance":
      return "Finance";
    case "consultant":
      return "Consultant";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
