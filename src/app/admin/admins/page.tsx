import { eq } from "drizzle-orm";
import { AdminsManager } from "@/components/admin/admins-manager";
import { getDb, schema } from "@/db";
import { requireSuperAdminPage } from "@/lib/auth";

export const metadata = { title: "Admins" };

/** Super admin only. Admins themselves can't see or reach this page. */
export default async function AdminsPage() {
  await requireSuperAdminPage();
  const admins = await getDb()
    .select({
      user_id: schema.profiles.user_id,
      full_name: schema.profiles.full_name,
      email: schema.user.email,
    })
    .from(schema.profiles)
    .innerJoin(schema.user, eq(schema.user.id, schema.profiles.user_id))
    .where(eq(schema.profiles.role, "admin"));

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">Super admin</p>
      <h1 className="mt-1 font-display text-4xl text-hb-ink">Admins</h1>
      <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
        Only you can see this page. Admins can run everything else in the console, but they
        can&apos;t create or remove admins, and they never see your account.
      </p>
      <div className="mt-8">
        <AdminsManager admins={admins} />
      </div>
    </div>
  );
}
