/**
 * @jest-environment node
 */
import { POST } from "@/app/api/ai/extract-transactions-pdf/route";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";

const ROWS =
  '[{"date":"2026-10-01","description":"Coffee","amount":1500,"currency":"ARS"}]';

const makeRequest = () =>
  new NextRequest("http://localhost/api/ai/extract-transactions-pdf", {
    method: "POST",
    body: JSON.stringify({ pdfBase64: "pdf-data" }),
    headers: { "content-type": "application/json" },
  });

const chatOk = {
  ok: true,
  json: async () => ({ choices: [{ message: { content: ROWS } }] }),
};
const fail = (message) => ({
  ok: false,
  status: 429,
  json: async () => ({ error: { message } }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.mockResolvedValue({ user: { id: 1 } });
  vi.stubEnv("GEMINI_API_KEY", "g");
  vi.stubEnv("GROQ_API_KEY", "q");
  vi.stubEnv("OPENROUTER_API_KEY", "o");
  global.fetch = vi.fn();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ai/extract-transactions-pdf", () => {
  it("falls back to OpenRouter with the PDF after Gemini and Groq fail", async () => {
    fetch
      .mockResolvedValueOnce(fail("quota"))
      .mockResolvedValueOnce(fail("quota"))
      .mockResolvedValueOnce(chatOk);

    const res = await POST(makeRequest());
    const openRouterRequest = JSON.parse(fetch.mock.calls[2][1].body);

    expect(res.status).toBe(200);
    expect((await res.json()).transactions).toEqual(JSON.parse(ROWS));
    expect(fetch.mock.calls[2][0]).toContain("openrouter.ai");
    expect(openRouterRequest.messages[0].content[1]).toEqual({
      type: "file",
      file: {
        filename: "statement.pdf",
        file_data: "data:application/pdf;base64,pdf-data",
      },
    });
  });
});
