/**
 * Convert an amount from a foreign currency to USD.
 * Rates are expressed as "units of foreign currency per 1 USD"
 * (Frankfurter API format with base=USD).
 */
export function convertToUSD(amount, currency, rates) {
  if (!currency || currency === "USD" || !rates || !rates[currency]) return amount;
  return amount / rates[currency];
}

/**
 * Return the currency symbol for a given ISO 4217 code.
 * Always returns "$" for USD. Falls back to the currency code if unknown.
 */
export function getCurrencySymbol(currency) {
  if (!currency || currency === "USD") return "$";
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(1)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}
