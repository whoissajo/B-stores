import { OrderStatus } from "@/components/order-status";

type PageProps = {
  searchParams: Promise<{ order_id?: string; client_order_id?: string; status?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <OrderStatus orderId={params.order_id || ""} clientOrderId={params.client_order_id || ""} />;
}