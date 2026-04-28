import { MobileTransactionDetail } from "@/components/MobileTransactionDetail";

export default async function TransactionDetailPage({ params }) {
  const { id } = await params;
  return <MobileTransactionDetail id={id} />;
}
