/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/expenses/groups/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { query } from "@/lib/db";
import { auth } from "@/auth";

const makeRequest = (method = "GET", body = null) =>
  new NextRequest("http://localhost/api/expenses/groups", {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 1 } });
});

describe("GET /api/expenses/groups", () => {
  it("returns 200 with groups array", async () => {
    query.mockResolvedValue([{ id: 1, name: "El Pegual 64" }]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/expenses/groups", () => {
  it("returns 201 when group is created", async () => {
    query.mockResolvedValue([{ id: 1 }]);
    const res = await POST(makeRequest("POST", { name: "Generales" }));
    expect(res.status).toBe(201);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(401);
  });
});
