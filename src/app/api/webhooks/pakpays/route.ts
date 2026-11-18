import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findString(value: unknown, keys: Set<string>, depth = 0): string | null {
  if (depth > 5 || !isRecord(value)) return null;
  for (const [key, entry] of Object.entries(value)) {
    if (keys.has(key) && typeof entry === "string" && entry.length > 0 && entry.length <= 120) {
      return entry;
    }
  }
  for (const entry of Object.values(value)) {
    if (isRecord(entry)) {
      const found = findString(entry, keys, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function validSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  const secret = process.env.PAKPAYS_WEBHOOK_SECRET?.trim();
  const apiKey = process.env.PAKPAYS_API_KEY?.trim();
  const apiBase = (process.env.PAKPAYS_API_BASE_URL || "https://pakpays.vercel.app").replace(/\/+$/, "");

  if (!secret || !apiKey) {
    return NextResponse.json({ ok: false, error: "Webhook verification is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > 64 * 1024) {
    return NextResponse.json({ ok: false, error: "Invalid webhook body." }, { status: 400 });
  }

  const signature = request.headers.get("x-pakpays-signature") || "";
  const deliveryId = request.headers.get("x-pakpays-delivery") || "";
  const event = request.headers.get("x-pakpays-event") || "";
  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(deliveryId) || !event) {
    return NextResponse.json({ ok: false, error: "Missing webhook delivery metadata." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Webhook body is not valid JSON." }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ ok: false, error: "Unexpected webhook payload." }, { status: 400 });
  }

  // PakPays currently emits payment.approved. Ignore other signed event types safely.
  if (event !== "payment.approved") {
    return NextResponse.json({ ok: true, received: true, ignored: true });
  }

  const orderId = findString(payload, new Set(["order_id", "transaction_id", "id"]));
  if (!orderId || !/^[A-Za-z0-9_-]{1,120}$/.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Webhook does not contain a usable PakPays order ID." }, { status: 400 });
  }

  try {
    // A valid webhook is a prompt to verify; PakPays' authenticated status API remains authoritative.
    const response = await fetch(apiBase + "/api/v1/check?order_id=" + encodeURIComponent(orderId), {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
    const result = await response.json() as JsonRecord;
    if (!response.ok || result.ok !== true) {
      return NextResponse.json({ ok: false, error: "Could not independently verify the payment with PakPays." }, { status: 502 });
    }

    const clientOrderId = typeof result.client_order_id === "string" ? result.client_order_id : "";
    const status = typeof result.status === "string" ? result.status : "";
    if (!clientOrderId.startsWith("BKS-") || (status !== "approved" && status !== "merchant_approved")) {
      return NextResponse.json({ ok: false, error: "The referenced payment is not an approved B-stores order." }, { status: 409 });
    }

    const payloadClientOrderId = findString(payload, new Set(["client_order_id"]));
    if (payloadClientOrderId && payloadClientOrderId !== clientOrderId) {
      return NextResponse.json({ ok: false, error: "Webhook order reference does not match the verified payment." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      received: true,
      verified: true,
      delivery_id: deliveryId,
      client_order_id: clientOrderId,
      status
    });
  } catch {
    // Non-2xx makes PakPays retry the at-least-once delivery.
    return NextResponse.json({ ok: false, error: "Payment verification is temporarily unavailable." }, { status: 502 });
  }
}
