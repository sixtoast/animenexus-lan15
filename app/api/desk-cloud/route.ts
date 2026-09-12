import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function serverClient() {
  return getSupabaseServerClient();
}

function normalizeKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().slice(0, 128);
  if (k.length < 8) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(k)) return null;
  return k;
}

export async function GET(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Desk cloud is not configured.", source: "unconfigured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const key = normalizeKey(searchParams.get("key"));
  if (!key) {
    return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("desk_cloud")
    .select("payload, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "supabase",
    key,
    payload: data?.payload ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Desk cloud is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key =
    typeof body === "object" && body && "key" in body
      ? normalizeKey((body as { key: unknown }).key)
      : null;
  const payload =
    typeof body === "object" && body && "payload" in body
      ? (body as { payload: unknown }).payload
      : null;

  if (!key) {
    return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("desk_cloud")
    .upsert(
      {
        key,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )
    .select("key, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "supabase",
    key: data.key,
    updatedAt: data.updated_at,
  });
}

export async function DELETE(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Desk cloud is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const key = normalizeKey(searchParams.get("key"));
  if (!key) {
    return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
  }

  const { error } = await sb.from("desk_cloud").delete().eq("key", key);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, key });
}
