import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = process.env.PAKPAYS_API_KEY?.trim();
  const apiBase = (process.env.PAKPAYS_API_BASE_URL || "https://pakpays.vercel.app").replace(/\/+$/, "");
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Payment verification is not configured." }, { status: 503 });
  }

  const orderId = new URL(request.url).searchParams.get("order_id")?.trim();
  if (!orderId || orderId.length > 120 || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
    return NextResponse.json({ ok: false, error: "A valid order reference is required." }, { status: 400 });
  }

  try {
    const response = await fetch(apiBase + "/api/v1/check?order_id=" + encodeURIComponent(orderId), {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok || result.ok !== true) {
      return NextResponse.json(
        { ok: false, error: typeof result.error === "string" ? result.error : "We could not verify this order." },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: result.order_id,
      client_order_id: result.client_order_id,
      status: result.status,
      amount: result.amount,
      payable_amount: result.payable_amount,
      currency: result.currency || "PKR",
      created_at: result.created_at,
      paid_at: result.paid_at
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return NextResponse.json({ ok: false, error: "The payment service could not be reached. Please refresh in a moment." }, { status: 502 });
  }
}