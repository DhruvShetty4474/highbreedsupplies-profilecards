import { requireAdminPage } from "@/lib/auth";
import { ProfileWorkbench } from "@/components/dashboard/profile-workbench";
import { fetchProfileById } from "@/lib/data";
import { appUrl } from "@/lib/utils";
import Link from "next/link";
import { RoleToggle } from "@/components/admin/role-toggle";
import { isAdminRole } from "@/lib/roles";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit customer" };

type Props = { params: Promise<{ userId: string }> };

export default async function AdminEditCustomerPage({ params }: Props) {
  await requireAdminPage();
  const { userId } = await params;
  const profile = await fetchProfileById(userId);
  if (!profile || isAdminRole(profile.role)) notFound();

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
          <RoleToggle userId={profile.user_id} role={profile.role} />
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
