import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as authGet, POST as authPost } from "@/app/api/auth/[...all]/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { getSessionProfile } from "@/lib/auth";
import { freshDb } from "./helpers/db";
import { absorbSetCookies, jar, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser } from "./helpers/users";

let ip = 10;
beforeEach(async () => {
  await freshDb();
  signOutBrowser();
  testIp.value = `198.51.100.${ip++}`;
});

describe("register → login → logout", () => {
  it("registers, is signed in, logs out, logs back in by email and username", async () => {
    const u = await registerUser({ email: "flow@example.com", username: "flow_user" });
    expect(u.res.status).toBe(200);
    expect((await getSessionProfile())?.username).toBe("flow_user");

    await logoutRoute(req("/api/auth/logout", { body: {} }));
    jar.clear();
    expect(await getSessionProfile()).toBeNull();

    const byEmail = await login("flow@example.com");
    expect(byEmail.res.status).toBe(200);
    expect(byEmail.json.role).toBe("client");

    const byUsername = await login("flow_user");
    expect(byUsername.res.status).toBe(200);
    expect((await getSessionProfile())?.username).toBe("flow_user");
  });

  it("rejects a wrong password and duplicate usernames/emails", async () => {
    await registerUser({ email: "a@example.com", username: "taken_name" });
    expect((await login("a@example.com", "WrongPass999")).res.status).toBe(401);

    const dupUser = await registerUser({ email: "b@example.com", username: "taken_name" });
    expect(dupUser.res.status).toBe(409);
    const dupEmail = await registerUser({ email: "a@example.com", username: "other_name" });
    expect(dupEmail.res.status).toBe(409);
    const reserved = await registerUser({ email: "c@example.com", username: "admin" });
    expect(reserved.res.status).toBe(409);
  });

  it("rate-limits repeated failed logins", async () => {
    await registerUser({ email: "rl@example.com", username: "rl_user" });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await login("rl@example.com", "nope-nope-nope")).res.status);
    }
    expect(statuses).toContain(429);
    // Even the right password is refused while limited.
    expect((await login("rl@example.com")).res.status).toBe(429);
  });
});

describe("password reset", () => {
  it("emails a link (console fallback), resets, old password stops working", async () => {
    await registerUser({ email: "reset@example.com", username: "reset_user" });
    signOutBrowser();

    const logs: string[] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((m: unknown) => {
      logs.push(String(m));
    });
    const r = await authPost(
      req("/api/auth/request-password-reset", {
        body: { email: "reset@example.com", redirectTo: "/reset-password" },
      })
    );
    spy.mockRestore();
    expect(r.status).toBe(200);

    const mail = logs.find((l) => l.includes("Reset your HIGHBREED password"));
    expect(mail).toBeDefined();
    const link = mail!.match(/https?:\/\/\S+\/api\/auth\/reset-password\/\S+/)![0];

    // Following the link redirects to our page with the token.
    const follow = await authGet(req(new URL(link).pathname + new URL(link).search));
    const location = follow.headers.get("location")!;
    expect(location).toContain("/reset-password?token=");
    const token = new URL(location, "http://x").searchParams.get("token")!;

    const reset = await authPost(
      req("/api/auth/reset-password", { body: { newPassword: "BrandNew@456", token } })
    );
    expect(reset.status).toBe(200);

    expect((await login("reset@example.com", "Password@123")).res.status).toBe(401);
    expect((await login("reset@example.com", "BrandNew@456")).res.status).toBe(200);

    // A token can't be reused.
    const again = await authPost(
      req("/api/auth/reset-password", { body: { newPassword: "Another@789", token } })
    );
    expect(again.status).toBe(400);
  });

  it("does not reveal whether an email exists", async () => {
    const r = await authPost(
      req("/api/auth/request-password-reset", {
        body: { email: "nobody@example.com", redirectTo: "/reset-password" },
      })
    );
    expect(r.status).toBe(200);
  });
});

describe("change password + delete account", () => {
  it("changes password and deletes the account with the right password only", async () => {
    await registerUser({ email: "del@example.com", username: "del_user" });

    const change = absorbSetCookies(
      await authPost(
        req("/api/auth/change-password", {
          body: { currentPassword: "Password@123", newPassword: "Changed@4567" },
        })
      )
    );
    expect(change.status).toBe(200);

    const wrong = await authPost(req("/api/auth/delete-user", { body: { password: "nope" } }));
    expect(wrong.status).toBe(400);

    const del = await authPost(req("/api/auth/delete-user", { body: { password: "Changed@4567" } }));
    expect(del.status).toBe(200);
    expect((await login("del@example.com", "Changed@4567")).res.status).toBe(401);
  });
});

describe("password strength + one device at a time", () => {
  it("rejects weak passwords everywhere", async () => {
    for (const weak of ["123123", "password", "Password1", "password@1", "PASSWORD@1", "Pa@1"]) {
      const r = await registerUser({ email: `w${weak.length}${Math.random()}@example.com`, password: weak });
      expect(r.res.status).toBe(400);
    }
    const ok = await registerUser({ email: "strong@example.com", password: "Strong@123" });
    expect(ok.res.status).toBeLessThan(300);

    const direct = await authPost(
      req("/api/auth/sign-up/email", { body: { email: "x2@example.com", password: "weakpass1", name: "X" } })
    );
    expect(direct.status).toBe(400);
  });

  it("a new sign-in signs out the previous device", async () => {
    await registerUser({ email: "solo@example.com", username: "solo_user" });
    signOutBrowser();
    await login("solo@example.com");
    const first = new Map(jar);
    signOutBrowser();
    await login("solo@example.com");
    expect((await getSessionProfile())?.email).toBe("solo@example.com");
    // Restore device 1's cookies: its session must be gone.
    signOutBrowser();
    for (const [k, v] of first) jar.set(k, v);
    expect(await getSessionProfile()).toBeNull();
  });
});
