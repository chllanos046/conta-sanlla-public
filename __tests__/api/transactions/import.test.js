/**
 * @jest-environment node
 */
import { POST } from "@/app/api/transactions/import/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(),
  queryConn: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { withTransaction, queryConn } from "@/lib/db";
import { auth } from "@/auth";

const makeRequest = (body) =>
  new NextRequest("http://localhost/api/transactions/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 1 } });
  withTransaction.mockImplementation(async (cb) => cb({}));
  queryConn.mockResolvedValue({ insertId: 1 });
});

describe("POST /api/transactions/import", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);

    const res = await POST(makeRequest({ transactions: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when transactions is missing or empty", async () => {
    const res = await POST(makeRequest({ transactions: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non-empty/);
  });

  it("returns 400 when a row has invalid type", async () => {
    const res = await POST(
      makeRequest({
        transactions: [
          { type: "invalid", amount: -50, date: "2024-01-15" },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid type/);
  });

  it("returns 400 when a row is missing amount", async () => {
    const res = await POST(
      makeRequest({
        transactions: [{ type: "expense", amount: null, date: "2024-01-15" }],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/amount/);
  });

  it("returns 400 when a row is missing date", async () => {
    const res = await POST(
      makeRequest({
        transactions: [{ type: "expense", amount: -50, date: "" }],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/date/);
  });

  it("returns 201 and imported count for valid transactions", async () => {
    const transactions = [
      { type: "expense", amount: -50, date: "2024-01-15", source_account_id: 1, description: "Lunch" },
      { type: "income", amount: 500, date: "2024-01-16", target_account_id: 2 },
    ];

    const res = await POST(makeRequest({ transactions }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(queryConn).toHaveBeenCalledTimes(2);
  });

  it("applies sign convention: expense positive amount becomes negative", async () => {
    const transactions = [
      { type: "expense", amount: 50, date: "2024-01-15", source_account_id: 1 },
    ];

    await POST(makeRequest({ transactions }));

    const call = queryConn.mock.calls[0];
    const params = call[2];
    expect(params[1]).toBe(-50); // amount negated
  });

  it("applies sign convention: income negative amount becomes positive", async () => {
    const transactions = [
      { type: "income", amount: -200, date: "2024-01-15", target_account_id: 2 },
    ];

    await POST(makeRequest({ transactions }));

    const call = queryConn.mock.calls[0];
    const params = call[2];
    expect(params[1]).toBe(200);
  });

  it("wraps all inserts in a single DB transaction", async () => {
    const transactions = [
      { type: "expense", amount: -10, date: "2024-01-01", source_account_id: 1 },
      { type: "income", amount: 20, date: "2024-01-02", target_account_id: 2 },
    ];

    await POST(makeRequest({ transactions }));

    expect(withTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when DB throws", async () => {
    withTransaction.mockRejectedValue(new Error("DB error"));

    const res = await POST(
      makeRequest({
        transactions: [{ type: "expense", amount: -50, date: "2024-01-15" }],
      }),
    );
    expect(res.status).toBe(500);
  });
});
