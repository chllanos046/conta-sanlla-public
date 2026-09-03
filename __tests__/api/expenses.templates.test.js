/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/expenses/templates/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { query } from "@/lib/db";
import { auth } from "@/auth";

const makeRequest = (method = "GET", body = null) =>
  new NextRequest("http://localhost/api/expenses/templates", {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 1 } });
});

const validTemplate = {
  group_id: 1,
  name: "Seguro Casa",
  default_amount: 173032,
  active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  due_day: 10,
};

describe("GET /api/expenses/templates", () => {
  it("returns 200 with templates", async () => {
    query.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/expenses/templates", () => {
  it("returns 201 when template is created", async () => {
    query.mockResolvedValue([{ id: 5 }]);
    const res = await POST(makeRequest("POST", validTemplate));
    expect(res.status).toBe(201);
  });

  it("returns 400 when active_months is empty", async () => {
    const res = await POST(makeRequest("POST", { ...validTemplate, active_months: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required field is missing", async () => {
    const res = await POST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeRequest("POST", validTemplate));
    expect(res.status).toBe(401);
  });
});
