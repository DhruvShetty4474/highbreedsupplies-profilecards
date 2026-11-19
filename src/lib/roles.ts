import type { AppRole } from "@/lib/types";

/** Admin console access: admins and the (hidden) super admin. */
export function isAdminRole(role: AppRole | string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

/**
 * Roles that never appear in lists, counts or public pages. The super admin
 * exists only for the person who manages admins.
 */
export const HIDDEN_ROLES = ["superadmin"] as const;

/** Where each role lands after signing in. */
export function homeFor(role: AppRole) {
  if (isAdminRole(role)) return "/admin";
  if (role === "manager") return "/manager";
  return "/dashboard";
}
