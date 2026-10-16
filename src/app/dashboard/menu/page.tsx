import { redirect } from "next/navigation";

/** Legacy mobile menu route → Settings */
export default function LegacyMenuRedirect() {
  redirect("/dashboard/settings");
}
