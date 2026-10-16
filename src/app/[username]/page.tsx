import { PublicProfile } from "@/components/profile/public-profile";
import { fetchProfileByUsername } from "@/lib/data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 60;

const RESERVED = new Set([
  "admin",
  "dashboard",
  "login",
  "signup",
  "api",
  "c",
  "auth",
  "settings",
]);

type Props = { params: { username: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (RESERVED.has(params.username.toLowerCase())) return {};
  const profile = await fetchProfileByUsername(params.username);
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
  if (RESERVED.has(params.username.toLowerCase())) notFound();

  const profile = await fetchProfileByUsername(params.username);
  if (!profile) notFound();

  return <PublicProfile profile={profile} />;
}
