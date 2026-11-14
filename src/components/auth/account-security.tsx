"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={`text-sm ${ok ? "text-hb-action" : "text-hb-danger"}`} role={ok ? "status" : "alert"}>
      {children}
    </p>
  );
}

/** Email verification, change password, delete account. */
export function AccountSecurity({
  email,
  emailVerified,
}: {
  email: string;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function resend() {
    setBusy("verify");
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard/settings?verified=1",
    });
    setBusy(null);
    setVerifyMsg(
      error
        ? { ok: false, text: authErrorMessage(error)! }
        : { ok: true, text: `Verification link sent to ${email}.` }
    );
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("new") || "");
    if (newPassword !== String(form.get("confirm") || "")) {
      setPwMsg({ ok: false, text: "New passwords don't match" });
      return;
    }
    setBusy("pw");
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("current") || ""),
      newPassword,
      revokeOtherSessions: true,
    });
    setBusy(null);
    if (error) {
      setPwMsg({
        ok: false,
        text: error.status === 400 ? "Current password is incorrect" : authErrorMessage(error)!,
      });
      return;
    }
    formEl.reset();
    setPwMsg({ ok: true, text: "Password changed. Other devices were signed out." });
  }

  async function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (String(form.get("confirm")) !== "DELETE") {
      setDelMsg('Type DELETE to confirm');
      return;
    }
    setBusy("del");
    const { error } = await authClient.deleteUser({
      password: String(form.get("password") || ""),
    });
    setBusy(null);
    if (error) {
      setDelMsg(error.status === 400 ? "Password is incorrect" : authErrorMessage(error));
      return;
    }
    router.push("/?deleted=1");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-hb-ink">Sign-in email</h2>
        <p className="mt-1 text-sm text-hb-leaf">
          {email} ·{" "}
          {emailVerified ? (
            <span className="font-semibold text-hb-action">Verified</span>
          ) : (
            <span className="font-semibold text-hb-danger">Not verified</span>
          )}
        </p>
        {!emailVerified ? (
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={resend}
            disabled={busy === "verify"}
          >
            {busy === "verify" ? "Sending…" : "Send verification email"}
          </Button>
        ) : null}
        {verifyMsg ? <div className="mt-2"><Notice ok={verifyMsg.ok}>{verifyMsg.text}</Notice></div> : null}
      </section>

      <section className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-hb-ink">Change password</h2>
        <form className="mt-3 grid gap-3" onSubmit={changePassword}>
          <Input name="current" type="password" label="Current password" autoComplete="current-password" required />
          <Input name="new" type="password" label="New password" minLength={8} maxLength={128} autoComplete="new-password" required />
          <Input name="confirm" type="password" label="Confirm new password" minLength={8} maxLength={128} autoComplete="new-password" required />
          {pwMsg ? <Notice ok={pwMsg.ok}>{pwMsg.text}</Notice> : null}
          <Button type="submit" disabled={busy === "pw"}>
            {busy === "pw" ? "Saving…" : "Change password"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-hb-danger/30 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-hb-danger">Delete account</h2>
        <p className="mt-1 text-sm text-hb-leaf">
          Permanently deletes your profile, leads and uploaded media. Your
          HighCards are disabled until HIGHBREED re-issues them. This can&apos;t be undone.
        </p>
        <form className="mt-3 grid gap-3" onSubmit={deleteAccount}>
          <Input name="password" type="password" label="Password" autoComplete="current-password" required />
          <Input name="confirm" label='Type "DELETE" to confirm' autoComplete="off" required />
          {delMsg ? <Notice ok={false}>{delMsg}</Notice> : null}
          <Button type="submit" variant="secondary" disabled={busy === "del"}>
            {busy === "del" ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </section>
    </div>
  );
}
