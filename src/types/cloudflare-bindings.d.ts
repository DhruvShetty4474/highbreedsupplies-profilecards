// Only the binding types we use, made global for cloudflare-env.d.ts —
// without pulling in the full Workers runtime types (they override DOM fetch).
type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type Fetcher = import("@cloudflare/workers-types").Fetcher;
