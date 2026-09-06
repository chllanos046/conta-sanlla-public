/**
 * @jest-environment node
 */
import { PATCH } from "@/app/api/expenses/instances/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { query } from "@/lib/db";
import { auth } from "@/auth";

const makeRequest = (body) =>
  new NextRequest("http://localhost/api/expenses/instances/1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

const call = (body) => PATCH(makeRequest(body), { params: Promise.resolve({ id: "1" }) });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 1 } });
  query.mockResolvedValue([]);
});

describe("PATCH /api/expenses/instances/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await call({ amount: 100 });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields are provided", async () => {
    const res = await call({});
    expect(res.status).toBe(400);
  });

  it("updates due_date", async () => {
    const res = await call({ due_date: "2026-10-10" });
    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("due_date = ?"),
      expect.arrayContaining(["2026-10-10"])
    );
  });

  it("updates amount", async () => {
    const res = await call({ amount: "123.45" });
    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("amount = ?"),
      expect.arrayContaining([123.45])
    );
  });

  it("updates paid and paid_date together", async () => {
    const res = await call({ paid: true, paid_date: "2026-09-04" });
    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("paid = ?"),
      expect.arrayContaining([true, "2026-09-04"])
    );
  });
});
