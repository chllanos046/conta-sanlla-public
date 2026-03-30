import { format } from "date-fns";

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function formatDate(dateString) {
  return format(new Date(dateString), "yyyy-MM-dd");
}

export function calculateRunningBalance(transactions) {
  let balance = 0;
  return transactions.map((tx) => {
    if (tx.type === "income") balance += parseFloat(tx.amount);
    if (tx.type === "expense") balance -= parseFloat(tx.amount);
    return { ...tx, runningBalance: balance };
  });
}
