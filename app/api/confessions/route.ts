import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_LEN = 280;
const MAX_LIST = 40;

function serverClient() {
  return getSupabaseServerClient();
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
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Confessions are not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text =
    typeof body === "object" &&
    body &&
    "text" in body &&
    typeof (body as { text: unknown }).text === "string"
      ? (body as { text: string }).text.trim()
      : "";

  if (!text || text.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Text must be 1–${MAX_LEN} characters.` },
      { status: 400 },
    );
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
    item: {
      id: data.id,
      text: data.text,
      createdAt: data.created_at,
    },
  });
}
