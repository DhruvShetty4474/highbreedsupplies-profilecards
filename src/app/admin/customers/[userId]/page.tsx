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
            You are editing <strong>@{profile.username}</strong> as admin. Changes
            apply to their public HighCard page immediately (demo store).
          </p>
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
