import { ProfileWorkbench } from "@/components/dashboard/profile-workbench";
import { getSessionProfile } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = { title: "Profile Workbench" };

export default async function DashboardPagesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <ProfileWorkbench
      profile={profile}
      publicUrl={`${appUrl()}/${profile.username}`}
    />
  );
}
