/** Default app URL for a `users.role` value after sign-in. */
export function getRoleHomePath(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "finance":
      return "/finance";
    case "consultant":
      return "/consultant";
    default:
      return "/protected";
  }
}
