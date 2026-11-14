"use client";

import { createAuthClient } from "better-auth/react";

/** Browser client for Better Auth endpoints under /api/auth (same origin). */
export const authClient = createAuthClient();

export function authErrorMessage(err: { message?: string; status?: number } | null | undefined) {
  if (!err) return null;
  if (err.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return err.message || "Something went wrong. Please try again.";
}
