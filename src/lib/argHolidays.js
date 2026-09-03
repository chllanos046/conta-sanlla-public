const cache = new Map();

export async function getHolidays(year) {
  if (cache.has(year)) return cache.get(year);
  try {
    const res = await fetch(`https://nolaborables.com.ar/api/v2/feriados/${year}`);
    const days = await res.json();
    const set = new Set(
      days.map(
        (d) =>
          `${year}-${String(d.mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`
      )
    );
    cache.set(year, set);
    return set;
  } catch {
    return new Set();
  }
}
