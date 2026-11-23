import { z } from "zod";

/** One rule for every password on the site (signup, reset, change, admin-created). */
export const PASSWORD_RULE =
  "At least 8 characters, with one capital letter, one small letter, one number and one special character.";

export function passwordProblem(p: string): string | null {
  if (typeof p !== "string" || p.length < 8) return PASSWORD_RULE;
  if (p.length > 128) return "Password is too long (max 128 characters).";
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
    return PASSWORD_RULE;
  }
  return null;
}

export const isStrongPassword = (p: string) => passwordProblem(p) === null;

/** zod schema for API routes. */
export const strongPassword = z.string().refine(isStrongPassword, { message: PASSWORD_RULE });
