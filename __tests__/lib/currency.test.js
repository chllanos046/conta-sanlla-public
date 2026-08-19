import { convertToUSD, convertAmount, getCurrencySymbol } from "@/lib/currency";

describe("convertToUSD", () => {
  const rates = { ARS: 1200, EUR: 0.92 };

  test("USD passes through unchanged", () => {
    expect(convertToUSD(100, "USD", rates)).toBe(100);
  });

  test("ARS divides by rate", () => {
    expect(convertToUSD(1200, "ARS", rates)).toBeCloseTo(1);
  });

  test("missing currency returns amount as-is", () => {
    expect(convertToUSD(50, null, rates)).toBe(50);
  });

  test("missing rates returns amount as-is", () => {
    expect(convertToUSD(50, "ARS", null)).toBe(50);
  });
});

describe("convertAmount", () => {
  const arsRate = 1200;

  test("same currency — no conversion", () => {
    expect(convertAmount(100, "USD", "USD", arsRate)).toBe(100);
    expect(convertAmount(1000, "ARS", "ARS", arsRate)).toBe(1000);
  });

  test("USD → ARS multiplies by rate", () => {
    expect(convertAmount(1, "USD", "ARS", arsRate)).toBe(1200);
    expect(convertAmount(10, "USD", "ARS", 1000)).toBe(10000);
  });

  test("ARS → USD divides by rate", () => {
    expect(convertAmount(1200, "ARS", "USD", arsRate)).toBeCloseTo(1);
    expect(convertAmount(600, "ARS", "USD", arsRate)).toBeCloseTo(0.5);
  });

  test("no rate — returns amount unchanged", () => {
    expect(convertAmount(100, "USD", "ARS", 0)).toBe(100);
    expect(convertAmount(100, "USD", "ARS", null)).toBe(100);
  });

  test("unknown currency pair — returns amount unchanged", () => {
    expect(convertAmount(100, "EUR", "JPY", arsRate)).toBe(100);
  });
});

describe("getCurrencySymbol", () => {
  test("USD returns $", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  test("null/undefined returns $", () => {
    expect(getCurrencySymbol(null)).toBe("$");
    expect(getCurrencySymbol(undefined)).toBe("$");
  });

  test("ARS returns a non-empty string", () => {
    const sym = getCurrencySymbol("ARS");
    expect(typeof sym).toBe("string");
    expect(sym.length).toBeGreaterThan(0);
  });
});
