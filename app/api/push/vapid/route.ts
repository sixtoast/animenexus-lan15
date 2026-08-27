import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Expose public VAPID key only — never the private key. */
export async function GET() {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  return NextResponse.json({
    configured: Boolean(publicKey),
    publicKey: publicKey || null,
  });
}
