import type { AppRole } from "@/lib/types";

/** Where each role lands after signing in. */
export function homeFor(role: AppRole) {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/manager";
  return "/dashboard";
}
