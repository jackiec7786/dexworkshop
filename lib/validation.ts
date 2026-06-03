import { z } from "zod";

// ---- Auth ----
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type Credentials = z.infer<typeof credentialsSchema>;

// ---- Domain pieces ----
const markSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  view: z.string(),
  type: z.string(),
  note: z.string().default(""),
  sqin: z.number().optional(),
});

const lineItemSchema = z.object({
  id: z.string(),
  desc: z.string().default(""),
  type: z.string(),
  qty: z.number(),
  price: z.number(),
});

const photoSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
});

// ---- Jobs (PATCH is a partial update) ----
export const jobPatchSchema = z
  .object({
    status: z.enum(["Quote", "Invoice", "Paid"]),
    customer: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    vehicle: z.object({
      make: z.string().optional(),
      model: z.string().optional(),
      year: z.string().optional(),
      plate: z.string().optional(),
      color: z.string().optional(),
      vin: z.string().optional(),
    }),
    marks: z.array(markSchema),
    line_items: z.array(lineItemSchema),
    notes: z.string(),
    discount: z.number(),
    tax_rate: z.number(),
    deposit: z.number(),
    photos: z.array(photoSchema),
  })
  .partial();
export type JobPatch = z.infer<typeof jobPatchSchema>;

// ---- Settings ----
export const settingsSchema = z.object({
  biz_name: z.string().default("My Workshop"),
  tagline: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  currency: z.string().default("Rs"),
  tax_rate: z.number().default(0),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// ---- Photo upload ----
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
