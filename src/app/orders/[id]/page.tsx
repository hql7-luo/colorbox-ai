import { OrderDetail } from "@/components/order-detail";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="page-shell">
      <OrderDetail id={id} />
    </div>
  );
}
