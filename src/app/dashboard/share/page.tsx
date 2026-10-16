import { SharePagePanel } from "@/components/share/share-page-panel";
import { getSessionProfile } from "@/lib/auth";
import { getSharePrefs, publicProfileUrl } from "@/lib/share-prefs";
import { appUrl } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = { title: "Share your page" };

export default async function DashboardSharePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/dashboard/share");

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const origin = host ? `${proto}://${host}` : appUrl();
  const pageUrl = publicProfileUrl(profile.username, origin);
  const prefs = getSharePrefs(profile.user_id);

  return (
    <SharePagePanel
      userId={profile.user_id}
      fullName={profile.full_name}
      username={profile.username}
      pageUrl={pageUrl}
      initialOffline={prefs.offline}
      initialQuickShare={prefs.quick_share}
    />
  );
}
