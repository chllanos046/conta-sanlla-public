import { getHolidays } from "./argHolidays";

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function calcDueDate(year, month, dueDay) {
  const holidays = await getHolidays(year);
  const d = new Date(year, month - 1, dueDay);
  while (true) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !holidays.has(toDateKey(d))) break;
    d.setDate(d.getDate() + 1);
  }
  return toDateKey(d);
}
