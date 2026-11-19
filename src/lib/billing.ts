import { z } from "zod";

/** Indian mobile: optional +91 / 0, then 10 digits starting 6–9. */
export function normalisePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The payment form. Same rules on the server and in the browser. */
export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .transform((v, ctx) => {
      const p = normalisePhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
      return p ?? "";
    }),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || GSTIN_RE.test(v), "GSTIN should look like 27ABCDE1234F1Z5"),
  address: z.string().trim().min(10, "Enter your full address").max(500),
  terms: z.literal(true, { error: "Please accept the terms & conditions" }),
  method: z.enum(["UPI", "CASH"]),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
