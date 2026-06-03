import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  const jobId = form.get("jobId");

  if (!(file instanceof File) || typeof jobId !== "string" || !jobId) {
    return NextResponse.json({ error: "Missing file or jobId." }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Image exceeds the 10 MB limit." }, { status: 413 });
  }
  if (file.type && !ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 415 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const pathname = `photos/${jobId}/${Date.now()}_${safeName}`;
  const blob = await put(pathname, file, { access: "public", token: env.blobToken });
  return NextResponse.json({ url: blob.url });
}
