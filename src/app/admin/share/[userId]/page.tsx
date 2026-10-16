import { SharePagePanel } from "@/components/share/share-page-panel";
import { getDemoProfileById } from "@/lib/demo-store";
import { getSharePrefs, publicProfileUrl } from "@/lib/share-prefs";
import { appUrl, isDemoMode } from "@/lib/utils";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const metadata = { title: "Share page" };

type Props = { params: { userId: string } };

export default function AdminShareCustomerPage({ params }: Props) {
  if (!isDemoMode()) notFound();
  const profile = getDemoProfileById(params.userId);
  if (!profile || profile.role !== "client") notFound();

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const origin = host ? `${proto}://${host}` : appUrl();
  const pageUrl = publicProfileUrl(profile.username, origin);
  const prefs = getSharePrefs(profile.user_id);

  return (
    <div>
      <Link
        href="/admin/share"
        className="text-xs font-semibold text-hb-action"
      >
        ← Back to Share the pages
      </Link>
      <div className="mt-4">
        <SharePagePanel
          userId={profile.user_id}
          fullName={profile.full_name}
          username={profile.username}
          pageUrl={pageUrl}
          initialOffline={prefs.offline}
          initialQuickShare={prefs.quick_share}
        />
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-hb-leaf">
        Tip: open{" "}
        <Link
          href={`/${profile.username}`}
          target="_blank"
          className="font-semibold text-hb-action"
        >
          visitor preview
        </Link>{" "}
        to see how others experience this page before sharing.
      </p>
    </div>
  );
}
