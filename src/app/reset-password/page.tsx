import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Link from "next/link";

export const metadata = { title: "Reset password" };

/** Better Auth redirects here as /reset-password?token=… (or ?error=…). */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <AuthCard
        title="Link expired"
        subtitle="This password reset link is invalid or has expired."
      >
        <Link href="/forgot-password" className="text-sm font-semibold text-hb-action">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be asked to sign in again afterwards.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
