import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/kv";

const LOCAL_API = process.env.BTC_LAB_LOCAL_API || "http://localhost:8765";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    const res = await fetch(`${LOCAL_API}/strategies`);
    const all = await res.json();
    const s = Array.isArray(all) ? all.find((x: { id: string }) => x.id === id) : null;
    return s ? NextResponse.json(s) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Offline" }, { status: 503 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  try {
    const res = await fetch(`${LOCAL_API}/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Offline" }, { status: 503 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await fetch(`${LOCAL_API}/strategies/${id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Offline" }, { status: 503 });
  }
}
