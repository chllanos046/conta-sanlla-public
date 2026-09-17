import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROMPT = `Extract all financial transactions visible in this image.
Rules:
- Numbers may use dots as thousands separators and commas as decimals (e.g. "46.460" = 46460, "34,19" = 34.19). Normalize to standard decimal numbers.
- Dates may appear as "23 Aug 2026" or similar — convert to YYYY-MM-DD.
- Amounts are always positive numbers (strip any minus/negative sign), EXCEPT for USDc/USDC/USDT/USD entries — for those, preserve the original sign (negative = money leaving the wallet, positive = money entering it).
- Currency may appear as "USDc", "USDC", "USDT", "USD Coin" — normalize all to "USD".
- When a "USDc → ARS" conversion row appears on the same date as a merchant/debit row whose ARS amount matches the ARS credit side of the conversion, they are ONE transaction. Output it once using the USDc amount and "USD" currency with the merchant row's description. Discard the duplicate ARS merchant row.
- Ignore section headers, search bars, and UI chrome.
Return ONLY a valid JSON array (no markdown, no explanation) where each element has:
  date (string, YYYY-MM-DD),
  description (string),
  amount (positive number, except signed for USD entries per the rule above),
  currency (ISO 4217 code).
If no transactions are found, return [].`;

function parseAIResponse(text) {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(stripped);
}

async function callGemini(apiKey, imageBase64, mimeType) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Gemini error");
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

async function callGroq(apiKey, imageBase64, mimeType) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Groq error");
  return json.choices?.[0]?.message?.content ?? "[]";
}

export async function POST(request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  const { imageBase64, mimeType = "image/jpeg", accountCurrency } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });

  let rawText;
  try {
    rawText = await callGemini(apiKey, imageBase64, mimeType);
  } catch (geminiErr) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: geminiErr.message }, { status: 502 });
    }
    try {
      rawText = await callGroq(groqKey, imageBase64, mimeType);
    } catch (groqErr) {
      return NextResponse.json({ error: groqErr.message }, { status: 502 });
    }
  }

  let transactions;
  try {
    transactions = parseAIResponse(rawText);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 502 });
  }

  const normCurrency = (c) => c?.toUpperCase().replace(/C$/, "") || "";
  const filtered = accountCurrency
    ? transactions.filter((t) => !t.currency || normCurrency(t.currency) === normCurrency(accountCurrency))
    : transactions;

  return NextResponse.json({ transactions: filtered });
}
