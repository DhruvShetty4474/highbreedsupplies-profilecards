import { ProfileWorkbench } from "@/components/dashboard/profile-workbench";
import { getDemoProfileById } from "@/lib/demo-store";
import { appUrl, isDemoMode } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit customer" };

type Props = { params: { userId: string } };

export default function AdminEditCustomerPage({ params }: Props) {
  if (!isDemoMode()) notFound();

  const profile = getDemoProfileById(params.userId);
  if (!profile || profile.role !== "client") notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/customers"
            className="text-xs font-semibold text-hb-action"
          >
            ← Back to customers
          </Link>
          <h1 className="mt-2 font-display text-3xl text-hb-ink">
            Edit customer profile
          </h1>
          <p className="mt-1 text-sm text-hb-leaf">
            Editing <strong>@{profile.username}</strong> — live preview on the
            right shows the visitor / client view before you save.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${profile.username}`}
            target="_blank"
            className="rounded-full border border-hb-sand bg-white px-4 py-2 text-xs font-semibold text-hb-ink"
          >
            Open visitor view
          </Link>
          <Link
            href={`/admin/share/${profile.user_id}`}
            className="rounded-full bg-hb-cta px-4 py-2 text-xs font-semibold text-hb-ink"
          >
            Share this page
          </Link>
        </div>
      </div>
      <ProfileWorkbench
        profile={profile}
        publicUrl={`${appUrl()}/${profile.username}`}
        adminUserId={profile.user_id}
      />
    </div>
  );
}
