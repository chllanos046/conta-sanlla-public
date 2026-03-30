import { NextResponse } from "next/server";

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache);
  }

  try {
    // open.er-api.com is free, no API key required, and includes ARS and other emerging market currencies
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Exchange rate fetch failed");
    const data = await res.json();
    // Response: { base_code: "USD", rates: { USD: 1, EUR: 0.92, ARS: 1050, ... } }
    const rates = data.rates;
    cache = rates;
    cacheTime = now;
    return NextResponse.json(rates);
  } catch {
    // Fallback: return only USD if external API fails
    return NextResponse.json({ USD: 1 });
  }
}
