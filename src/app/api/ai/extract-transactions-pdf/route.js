import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROMPT = `You are parsing an Argentine credit card statement PDF. Extract every purchase/charge transaction.

Rules:
- Include ALL charges from ALL cardholders (titular and adicionales) — they all belong to the same account.
- SKIP: payment rows ("SU PAGO EN PESOS", "SU PAGO"), total/subtotal rows, section headers, interest rows, tax rows, promotional rows.
- For installment purchases (e.g. "C.03/03", "CUOTA 1 DE 6"), output ONE row per installment line as it appears — do NOT expand or collapse them. The amount shown is the amount for that installment.
- Dates appear as DD-Mon-YY (e.g. "07-Ago-26") — convert to YYYY-MM-DD. Month abbreviations: Ene=01 Feb=02 Mar=03 Abr=04 May=05 Jun=06 Jul=07 Ago=08 Sep=09 Oct=10 Nov=11 Dic=12.
- Amounts use dots as thousands separators and commas as decimals (e.g. "1.357.989,52" = 1357989.52). Normalize to standard decimal.
- Amounts are always positive numbers.
- Currency: if a row has a value in the PESOS column, currency is "ARS". If in the DÓLARES column, currency is "USD". Default to "ARS" if unclear.
- Clean up descriptions: remove voucher/cupón numbers, keep the merchant name and installment info if present.

Return ONLY a valid JSON array (no markdown, no explanation) where each element has:
  date (string, YYYY-MM-DD),
  description (string),
  amount (positive number),
  currency (ISO 4217 code, "ARS" or "USD").

If no transactions are found, return [].`;

function parseRetrySeconds(message) {
  const match = message?.match(/in\s+(\d+(?:\.\d+)?)\s*s\b/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

function parseAIResponse(text) {
  const stripped = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(stripped);
}

async function callGemini(apiKey, pdfBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: { mime_type: "application/pdf", data: pdfBase64 },
              },
            ],
          },
        ],
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    console.error(
      "[extract-transactions-pdf] Gemini error:",
      res.status,
      JSON.stringify(json.error),
    );
    throw new Error(json.error?.message ?? "Gemini error");
  }
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

async function callOpenAICompatible({ name, url, apiKey, model }, pdfBase64) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "file",
              file: {
                filename: "statement.pdf",
                file_data: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(
      `[extract-transactions-pdf] ${name} error:`,
      res.status,
      JSON.stringify(json.error),
    );
    throw new Error(json.error?.message ?? `${name} error`);
  }
  return json.choices?.[0]?.message?.content ?? "[]";
}

function fallbackProviders() {
  return [
    {
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: "qwen/qwen3.8-27b",
    },
    {
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "google/gemma-3-27b-it:free",
    },
  ].filter((provider) => provider.apiKey);
}

export async function POST(request) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set." },
      { status: 500 },
    );
  }

  const { pdfBase64, accountCurrency } = await request.json();
  if (!pdfBase64)
    return NextResponse.json({ error: "pdfBase64 required" }, { status: 400 });

  let rawText;
  const errors = [];
  try {
    rawText = await callGemini(apiKey, pdfBase64);
  } catch (err) {
    errors.push(err);
    for (const provider of fallbackProviders()) {
      try {
        rawText = await callOpenAICompatible(provider, pdfBase64);
        break;
      } catch (fallbackErr) {
        errors.push(fallbackErr);
      }
    }
  }

  if (rawText === undefined) {
    const retryDelays = errors
      .map((err) => parseRetrySeconds(err.message))
      .filter((seconds) => seconds !== null);
    if (errors.length > 1 && retryDelays.length > 0) {
      const retryAfter = Math.min(...retryDelays);
      return NextResponse.json(
        {
          error: `All providers are rate-limited. Retry in ${retryAfter} seconds.`,
          retryAfter,
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: errors.at(-1).message }, { status: 502 });
  }

  let transactions;
  try {
    transactions = parseAIResponse(rawText);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw: rawText },
      { status: 502 },
    );
  }

  const normCurrency = (c) => c?.toUpperCase() || "";
  const filtered = accountCurrency
    ? transactions.filter(
        (t) =>
          !t.currency ||
          normCurrency(t.currency) === normCurrency(accountCurrency),
      )
    : transactions;

  return NextResponse.json({ transactions: filtered });
}
