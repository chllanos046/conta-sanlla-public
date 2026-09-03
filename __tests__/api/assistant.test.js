/**
 * @jest-environment node
 */
import { GET as getAccounts } from "@/app/api/assistant/accounts/route";
import { GET as getCategories } from "@/app/api/assistant/categories/route";
import { POST as postTransaction } from "@/app/api/assistant/transactions/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { query } from "@/lib/db";

const TOKEN = "test-token";

const makeRequest = (url, method = "GET", body = null, token = TOKEN) =>
  new NextRequest(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ASSISTANT_API_TOKEN = TOKEN;
});

describe("assistant API auth", () => {
  it("returns 401 without a token", async () => {
    const res = await getAccounts(makeRequest("http://localhost/api/assistant/accounts", "GET", null, null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with a wrong token", async () => {
    const res = await getAccounts(makeRequest("http://localhost/api/assistant/accounts", "GET", null, "wrong"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/assistant/accounts", () => {
  it("returns 200 with accounts", async () => {
    query.mockResolvedValueOnce([{ id: 1, name: "Cash", currency: "USD", initial_balance: 100 }]);
    query.mockResolvedValueOnce([]);
    const res = await getAccounts(makeRequest("http://localhost/api/assistant/accounts"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/assistant/categories", () => {
  it("returns 200 with categories", async () => {
    query.mockResolvedValue([{ id: 1, name: "Groceries", type: "expense" }]);
    const res = await getCategories(makeRequest("http://localhost/api/assistant/categories"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/assistant/transactions", () => {
  it("creates a transaction and returns 201", async () => {
    query.mockResolvedValue([{ id: 42 }]);
    const res = await postTransaction(
      makeRequest("http://localhost/api/assistant/transactions", "POST", {
        type: "expense",
        amount: -50,
        source_account_id: 1,
        category_id: 2,
        date: "2026-09-01",
        description: "Coffee",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(42);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await postTransaction(
      makeRequest("http://localhost/api/assistant/transactions", "POST", {}),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when income amount is not positive", async () => {
    const res = await postTransaction(
      makeRequest("http://localhost/api/assistant/transactions", "POST", {
        type: "income",
        amount: -10,
        date: "2026-09-01",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for cross-currency transfer missing exchange_rate", async () => {
    query.mockResolvedValueOnce([{ currency: "USD" }]);
    query.mockResolvedValueOnce([{ currency: "ARS" }]);
    const res = await postTransaction(
      makeRequest("http://localhost/api/assistant/transactions", "POST", {
        type: "transfer",
        amount: 100,
        source_account_id: 1,
        target_account_id: 2,
        date: "2026-09-01",
      }),
    );
    expect(res.status).toBe(400);
  });
});
