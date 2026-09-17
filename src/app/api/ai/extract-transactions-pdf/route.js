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

function parseAIResponse(text) {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(stripped);
}

async function callGemini(apiKey, pdfBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
          ],
        }],
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Gemini error");
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

export async function POST(request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
  }

  const { pdfBase64, accountCurrency } = await request.json();
  if (!pdfBase64) return NextResponse.json({ error: "pdfBase64 required" }, { status: 400 });

  let rawText;
  try {
    rawText = await callGemini(apiKey, pdfBase64);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  let transactions;
  try {
    transactions = parseAIResponse(rawText);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 502 });
  }

  const normCurrency = (c) => c?.toUpperCase() || "";
  const filtered = accountCurrency
    ? transactions.filter((t) => !t.currency || normCurrency(t.currency) === normCurrency(accountCurrency))
    : transactions;

  return NextResponse.json({ transactions: filtered });
}
