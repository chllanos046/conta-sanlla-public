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
    const res = await fetch("https://dolarapi.com/v1/dolares/cripto");
    if (!res.ok) throw new Error("Exchange rate fetch failed");
    const data = await res.json();
    // Response: { compra: 1250.5, venta: 1255.0, ... }
    // "compra" = ARS needed to buy 1 USD
    const rates = { USD: 1, ARS: data.compra };
    cache = rates;
    cacheTime = now;
    return NextResponse.json(rates);
  } catch {
    // Fallback: return only USD if external API fails
    return NextResponse.json({ USD: 1 });
  }
}
