/**
 * @jest-environment node
 */
import { POST } from "@/app/api/expenses/instances/generate/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/argHolidays", () => ({
  getHolidays: vi.fn().mockResolvedValue(new Set()),
}));

import { query } from "@/lib/db";
import { auth } from "@/auth";

const makeRequest = (body) =>
  new NextRequest("http://localhost/api/expenses/instances/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 1 } });
});

describe("POST /api/expenses/instances/generate", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeRequest({ year: 2026 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid year", async () => {
    const res = await POST(makeRequest({ year: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns total:0 when no templates are eligible", async () => {
    query.mockResolvedValueOnce([]);
    const res = await POST(makeRequest({ year: 2026 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
  });

  it("bulk-inserts eligible template/month pairs and reports created/updated", async () => {
    query
      .mockResolvedValueOnce([
        { id: 1, default_amount: 100, due_day: 5, month: 9 },
        { id: 1, default_amount: 100, due_day: 5, month: 10 },
      ])
      .mockResolvedValueOnce([{ inserted: true }, { inserted: false }]);

    const res = await POST(makeRequest({ year: 2026 }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ total: 2, created: 1, updated: 1 });
    // second query is the bulk insert — one round trip regardless of row count
    expect(query).toHaveBeenCalledTimes(2);
  });
});
