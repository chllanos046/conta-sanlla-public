import { calcDueDate } from "@/lib/dueDate";

vi.mock("@/lib/argHolidays", () => ({
  getHolidays: vi.fn().mockResolvedValue(new Set()),
}));

describe("calcDueDate", () => {
  it("returns the due day when it falls on a weekday", async () => {
    // 2026-08-10 is a Monday
    const result = await calcDueDate(2026, 8, 10);
    expect(result).toBe("2026-08-10");
  });

  it("shifts Saturday to Monday", async () => {
    // 2026-08-01 is a Saturday
    const result = await calcDueDate(2026, 8, 1);
    expect(result).toBe("2026-08-03"); // Monday
  });

  it("shifts Sunday to Monday", async () => {
    // 2026-08-02 is a Sunday
    const result = await calcDueDate(2026, 8, 2);
    expect(result).toBe("2026-08-03"); // Monday
  });

  it("shifts holiday to next business day", async () => {
    const { getHolidays } = await import("@/lib/argHolidays");
    getHolidays.mockResolvedValueOnce(new Set(["2026-08-10"]));
    // 2026-08-10 Mon is a holiday → 2026-08-11 Tue
    const result = await calcDueDate(2026, 8, 10);
    expect(result).toBe("2026-08-11");
  });
});
