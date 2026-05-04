
export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "";
  return String(dateString).slice(0, 10);
}

