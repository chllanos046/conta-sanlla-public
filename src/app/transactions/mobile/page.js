import { Suspense } from "react";
import { MobileTransactionsList } from "@/components/MobileTransactionsList";

export default function TransactionsMobilePage() {
  return (
    <Suspense fallback={null}>
      <MobileTransactionsList />
    </Suspense>
  );
}
