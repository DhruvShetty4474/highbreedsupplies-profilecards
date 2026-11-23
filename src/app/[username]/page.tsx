import { PublicProfile } from "@/components/profile/public-profile";
import { fetchProfileByUsername } from "@/lib/data";
import { getSessionProfile } from "@/lib/auth";
import { recordViewerAsLead } from "@/lib/leads";
import { RESERVED_USERNAMES as RESERVED } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";


type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (RESERVED.has(username.toLowerCase())) return {};
  const profile = await fetchProfileByUsername(username);
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.full_name} · @${profile.username}`,
    description: profile.designation || profile.bio,
    openGraph: {
      title: profile.full_name,
      description: profile.designation,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function UsernameProfilePage({ params }: Props) {
  const { username } = await params;
  if (RESERVED.has(username.toLowerCase())) notFound();

  const profile = await fetchProfileByUsername(username);
  if (!profile) notFound();

  // Visitors get the contact file automatically; the owner viewing their own page doesn't.
  const viewer = await getSessionProfile().catch(() => null);
  // Signed-in visitors land in the owner's Contacts automatically.
  await recordViewerAsLead(profile.user_id, viewer).catch(() => undefined);
  return <PublicProfile profile={profile} autoSaveContact={viewer?.user_id !== profile.user_id} />;
}
