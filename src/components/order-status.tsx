"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/books";

type StatusData = {
  ok: boolean;
  order_id?: string;
  client_order_id?: string | null;
  status?: string;
  amount?: number;
  payable_amount?: number;
  currency?: string;
  paid_at?: string | null;
  error?: string;
};

export function OrderStatus({ orderId, clientOrderId }: { orderId: string; clientOrderId: string }) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("We couldn't find an order reference in the return link. Your payment may still be processing.");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;

    const check = async () => {
      try {
        const response = await fetch("/api/order-status?order_id=" + encodeURIComponent(orderId), { cache: "no-store" });
        const result = await response.json() as StatusData;
        if (cancelled) return;
        if (!response.ok || result.ok !== true) {
          setError(result.error || "We couldn't verify the order yet.");
        } else {
          setData(result);
          setError("");
        }
      } catch {
        if (!cancelled) setError("We couldn't reach the payment service just now.");
      } finally {
        count += 1;
        if (!cancelled) {
          setLoading(false);
          setAttempts(count);
          const current = data?.status;
          if (count < 36 && current !== "approved" && current !== "merchant_approved" && current !== "timeout" && current !== "cancelled") {
            timer = setTimeout(check, 5000);
          }
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId]);

  const status = data?.status || "checking";
  const paid = status === "approved" || status === "merchant_approved";
  const expired = status === "timeout";
  const cancelledPayment = status === "cancelled";

  return (
    <main className="status-page">
      <div className="status-top">
        <Link href="/" className="brand brand-dark"><span className="brand-mark">b.</span><span>B-stores</span></Link>
        <span className="secure-note"><ShieldCheck size={15} /> Secure payment status</span>
      </div>
      <section className="status-card">
        <div className={"status-icon " + (paid ? "status-icon-success" : expired || cancelledPayment ? "status-icon-muted" : "status-icon-pending")}>
          {paid ? <CheckCircle2 size={32} /> : <Clock3 size={32} />}
        </div>
        <p className="eyebrow">{paid ? "Order confirmed" : "Payment update"}</p>
        <h1>{paid ? "Your next chapter starts here." : expired ? "The payment window has ended." : cancelledPayment ? "This payment was cancelled." : "Your order is on its way to confirmation."}</h1>
        <p className="status-copy">
          {paid
            ? "PakPays has confirmed this payment. Thank you for choosing B-stores."
            : expired
              ? "A timed-out request does not prove that no transfer was made. A late bank credit may still need merchant review."
              : cancelledPayment
                ? "No successful payment is recorded for this order. You can return to the shop and try again."
                : "We're checking the status directly with PakPays. Keep this page open for an automatic update."}
        </p>

        {data && (
          <div className="order-summary">
            <div><span>Order reference</span><strong>{data.client_order_id || clientOrderId || data.order_id}</strong></div>
            <div><span>Order amount</span><strong>{typeof data.amount === "number" ? formatPrice(data.amount) : "—"}</strong></div>
            <div><span>Payable amount</span><strong>{typeof data.payable_amount === "number" ? formatPrice(data.payable_amount) : "—"}</strong></div>
            <div><span>Payment status</span><strong className={paid ? "text-success" : ""}>{status.replaceAll("_", " ")}</strong></div>
          </div>
        )}

        {error && <p className="status-error" role="alert">{error}</p>}
        {!paid && !expired && !cancelledPayment && <p className="polling-note"><RefreshCw size={14} className={loading ? "spin" : ""} /> {loading ? "Checking with PakPays…" : attempts >= 36 ? "Still waiting. Refresh to check again." : "Automatic status checks are active."}</p>}
        <div className="status-actions">
          <Link href="/" className="button button-primary"><BookOpen size={16} /> Back to the bookstore</Link>
          {!paid && <button type="button" className="button button-quiet" onClick={() => window.location.reload()}><RefreshCw size={15} /> Refresh status</button>}
        </div>
        <p className="status-footnote">A browser return link is not proof of payment. This page only confirms an order after a server-to-server status check with PakPays.</p>
      </section>
      <p className="status-brand-note">Made for readers, by readers. <span>✦</span></p>
    </main>
  );
}