import { redirect } from "next/navigation";

/** App entry: go straight to sign-in (no marketing phone shell). */
export default function HomePage() {
  redirect("/login");
}
