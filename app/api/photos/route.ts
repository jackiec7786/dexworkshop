import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const jobId = form.get("jobId") as string | null;
  if (!file || !jobId) return NextResponse.json({ error: "missing file or jobId" }, { status: 400 });
  const pathname = `photos/${jobId}/${Date.now()}_${file.name}`;
  const blob = await put(pathname, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
