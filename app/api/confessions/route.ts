import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_LEN = 280;
const MAX_LIST = 40;

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

export async function GET() {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { items: [], source: "unconfigured" },
      { status: 200 },
    );
  }

  const { data, error } = await sb
    .from("confessions")
    .select("id, text, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_LIST);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "supabase",
    items: (data ?? []).map((r) => ({
      id: r.id,
      text: r.text,
      at: r.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim().slice(0, MAX_LEN);
  if (!text) {
    return NextResponse.json({ error: "Empty confession" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("confessions")
    .insert({ text })
    .select("id, text, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    item: { id: data.id, text: data.text, at: data.created_at },
  });
}
