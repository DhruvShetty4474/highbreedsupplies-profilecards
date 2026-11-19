import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps jsx: "preserve" for Next; tests compile JSX themselves.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Process better-auth through Vite so our next/headers mock applies to it.
    server: { deps: { inline: [/better-auth/] } },
    // Password hashing (scrypt) is deliberately slow.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      APP_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      ADMIN_EMAILS: "boss@example.com",
      MEDIA_MAX_IMAGE_MB: "5",
      MEDIA_MAX_VIDEO_MB: "50",
      MEDIA_QUOTA_MB_PER_USER: "10",
      R2_PUBLIC_URL: "https://media.test",
      // Older suites sign in straight after signup; OTP tests turn this on.
      REQUIRE_EMAIL_VERIFICATION: "false",
    },
  },
});
