import { NextResponse } from "next/server";
import { books } from "@/lib/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestedItem = { id: string; quantity: number };

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const apiKey = process.env.PAKPAYS_API_KEY?.trim();
  const apiBase = (process.env.PAKPAYS_API_BASE_URL || "https://pakpays.vercel.app").replace(/\/+$/, "");
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Online checkout is not configured yet. Please try again later." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Please submit a valid checkout." }, { status: 400 });
  }

  const name = cleanText(body.customer_name, 120);
  const email = cleanText(body.customer_email, 254);
  const clientOrderId = cleanText(body.client_order_id, 100);
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Please enter your full name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!/^BKS-[A-Za-z0-9-]{8,90}$/.test(clientOrderId)) {
    return NextResponse.json({ ok: false, error: "Your order reference is invalid. Please try again." }, { status: 400 });
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 20) {
    return NextResponse.json({ ok: false, error: "Your basket is empty or contains too many different books." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const raw of rawItems as RequestedItem[]) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const quantity = Number(raw?.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || !books.some((book) => book.id === id)) {
      return NextResponse.json({ ok: false, error: "One of the basket items is invalid. Please refresh and try again." }, { status: 400 });
    }
    quantities.set(id, Math.min(10, (quantities.get(id) || 0) + quantity));
  }

  const orderLines = Array.from(quantities.entries()).map(([id, quantity]) => {
    const book = books.find((entry) => entry.id === id)!;
    return { book, quantity };
  });
  const total = orderLines.reduce((sum, line) => sum + line.book.price * line.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 100 || total > 1_000_000) {
    return NextResponse.json({ ok: false, error: "The order total is outside the available checkout range." }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  let redirectUrl: string;
  try {
    const site = new URL(origin);
    if (process.env.NODE_ENV === "production" && site.protocol !== "https:") {
      throw new Error("HTTPS is required");
    }
    redirectUrl = new URL("/checkout/success", site).toString();
  } catch {
    return NextResponse.json({ ok: false, error: "The bookstore return URL is not configured correctly." }, { status: 503 });
  }

  const summary = orderLines.map((line) => line.quantity + "x " + line.book.title).join(", ").slice(0, 210);
  const payload = {
    amount: total / 100,
    client_order_id: clientOrderId,
    customer_name: name,
    customer_email: email,
    description: "B-stores book order: " + summary,
    redirect_url: redirectUrl
  };

  let response: Response;
  try {
    response = await fetch(apiBase + "/api/v1/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    return NextResponse.json({ ok: false, error: "We could not reach the payment service. Your basket is safe; please try again." }, { status: 502 });
  }

  let result: Record<string, unknown>;
  try {
    result = await response.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "The payment service returned an unexpected response." }, { status: 502 });
  }

  if (!response.ok || result.ok !== true || typeof result.payment_url !== "string") {
    const message = typeof result.error === "string" ? result.error : "The payment request could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 });
  }

  return NextResponse.json({
    ok: true,
    payment_url: result.payment_url,
    order_id: result.order_id,
    client_order_id: clientOrderId,
    amount: result.amount,
    payable_amount: result.payable_amount,
    currency: result.currency || "PKR"
  }, { headers: { "Cache-Control": "no-store" } });
}