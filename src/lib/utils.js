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

