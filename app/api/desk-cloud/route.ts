import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().slice(0, 128);
  if (k.length < 8) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(k)) return null;
  return k;
}

/** GET ?key=device_key — soft-fail empty when unconfigured */
export async function GET(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { source: "unconfigured", pack: null },
      { status: 200 },
    );
  }

  const key = normalizeKey(new URL(req.url).searchParams.get("key"));
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("desk_cloud")
    .select("pack, updated_at")
    .eq("device_key", key)
    .maybeSingle();

  if (error) {
    console.warn("[desk-cloud] get", error.message);
    return NextResponse.json(
      { source: "error", pack: null, message: error.message },
      { status: 200 },
    );
  }

  return NextResponse.json({
    source: "supabase",
    pack: data?.pack ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

/** POST { key, pack } — upsert soft desk snapshot */
export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase is not configured", source: "unconfigured" },
      { status: 503 },
    );
  }

  let body: { key?: string; pack?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = normalizeKey(body.key);
  if (!key) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  if (!body.pack || typeof body.pack !== "object") {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  // Bound payload size (~400KB JSON)
  const encoded = JSON.stringify(body.pack);
  if (encoded.length > 400_000) {
    return NextResponse.json({ error: "Pack too large" }, { status: 413 });
  }

  const { error } = await sb.from("desk_cloud").upsert(
    {
      device_key: key,
      pack: body.pack,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_key" },
  );

  if (error) {
    console.warn("[desk-cloud] upsert", error.message);
    return NextResponse.json(
      { error: error.message, source: "error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, source: "supabase" });
}
