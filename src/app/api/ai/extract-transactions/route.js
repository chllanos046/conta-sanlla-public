import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROMPT = `Extract all financial transactions visible in this image.
Rules:
- Transcribe each amount EXACTLY as it appears on screen, digit for digit, including every dot, comma, and minus sign. Do NOT do any math or reformatting — just copy the string (e.g. if the screen shows "1.000" write "1.000", if it shows "34,19" write "34,19"). This applies to every currency, including USDc/USDC/USDT/USD.
- Dates may appear as "23 Aug 2026" or similar — convert to YYYY-MM-DD.
- For USDc/USDC/USDT/USD entries, keep the sign shown (negative = money leaving the wallet, positive = money entering it). For all other currencies, drop any minus sign — those amounts are always output positive.
- Currency may appear as "USDc", "USDC", "USDT", "USD Coin" — normalize all to "USD".
- Do NOT merge, de-duplicate, or discard any rows yourself — output every visible row exactly as it appears, even if two rows seem to represent the same event.
- When a row is a "USDc → ARS" (or similar) wallet conversion that shows both the USDc/USD side and its ARS equivalent, also transcribe that ARS number into "ars_equivalent" (same digit-for-digit rule). Leave "ars_equivalent" out entirely for rows that are not this kind of conversion.
- Ignore section headers, search bars, and UI chrome.
Return ONLY a valid JSON array (no markdown, no explanation) where each element has:
  date (string, YYYY-MM-DD),
  description (string),
  amount (string, transcribed exactly as shown per the rule above),
  currency (ISO 4217 code),
  ars_equivalent (string, optional — only for USDc/USD conversion rows per the rule above).
If no transactions are found, return [].`;

function parseRetrySeconds(message) {
  const match = message?.match(/in\s+(\d+(?:\.\d+)?)\s*s\b/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

const normCurrency = (c) => c?.toUpperCase().replace(/C$/, "") || "";

function parseAIResponse(text) {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const transactions = JSON.parse(stripped).map((t) => ({ ...t, amount: normalizeAmount(t.amount) }));
  return mergeConversionRows(transactions);
}

// Converts a transcribed amount string to a number, treating "." as a thousands
// separator and "," as the decimal separator (es-AR convention), regardless of
// currency — e.g. "1.000" -> 1000, "-34,19" -> -34.19, "1.234,56" -> 1234.56.
function normalizeAmount(raw) {
  if (typeof raw === "number") return raw;
  const digitsOnly = String(raw).trim().replace(/[^0-9,.\-]/g, "");
  const cleaned = digitsOnly.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}

// The model used to merge a "USDc -> ARS" wallet conversion with its duplicate
// ARS merchant row itself, but doing that reasoning inside structured JSON
// output turned out unreliable — it stopped merging altogether. Instead the
// model now emits every row untouched plus an "ars_equivalent" on conversion
// rows, and we do the matching/merging deterministically here: for each USD
// conversion row, find a same-date non-USD row whose amount matches its ARS
// equivalent, adopt that row's description, and drop the duplicate.
function mergeConversionRows(transactions) {
  const dropped = new Set();
  const merged = transactions.map((t, i) => {
    if (dropped.has(i)) return null;
    if (normCurrency(t.currency) !== "USD" || t.ars_equivalent == null || t.ars_equivalent === "") {
      return t;
    }
    const arsValue = Math.abs(normalizeAmount(t.ars_equivalent));
    const matchIdx = transactions.findIndex(
      (other, j) =>
        j !== i &&
        !dropped.has(j) &&
        other.date === t.date &&
        normCurrency(other.currency) !== "USD" &&
        Math.abs(Math.abs(other.amount) - arsValue) < 1
    );
    if (matchIdx === -1) return t;
    dropped.add(matchIdx);
    const { ars_equivalent, ...rest } = t;
    return { ...rest, description: transactions[matchIdx].description || t.description };
  });
  return merged.filter(Boolean).map(({ ars_equivalent, ...rest }) => rest);
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
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                date: { type: "STRING" },
                description: { type: "STRING" },
                amount: { type: "STRING" },
                currency: { type: "STRING" },
                ars_equivalent: { type: "STRING" },
              },
              required: ["date", "description", "amount", "currency"],
            },
          },
        },
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) {
    console.error("[extract-transactions] Gemini error:", res.status, JSON.stringify(json.error));
    throw new Error(json.error?.message ?? "Gemini error");
  }
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
      model: "qwen/qwen3.8-27b",
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
  if (!res.ok) {
    console.error("[extract-transactions] Groq error:", res.status, JSON.stringify(json.error));
    throw new Error(json.error?.message ?? "Groq error");
  }
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
      const retryDelays = [parseRetrySeconds(geminiErr.message), parseRetrySeconds(groqErr.message)]
        .filter((s) => s !== null);
      if (retryDelays.length > 0) {
        const retryAfter = Math.min(...retryDelays);
        return NextResponse.json(
          { error: `Both providers are rate-limited. Retry in ${retryAfter} seconds.`, retryAfter },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: groqErr.message }, { status: 502 });
    }
  }

  let transactions;
  try {
    transactions = parseAIResponse(rawText);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 502 });
  }

  const filtered = accountCurrency
    ? transactions.filter((t) => !t.currency || normCurrency(t.currency) === normCurrency(accountCurrency))
    : transactions;

  return NextResponse.json({ transactions: filtered });
}
