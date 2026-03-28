import { DailyContribution, HeatmapCell, HeatmapGrid } from "./types.js";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function mondayBasedDay(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildHeatmapGrid(
  dailyContributions: DailyContribution[],
  today: string
): HeatmapGrid {
  const todayDate = new Date(today + "T00:00:00");
  const startDate = new Date(todayDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  while (mondayBasedDay(startDate) !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const countMap = new Map<string, number>();
  for (const d of dailyContributions) {
    countMap.set(d.date, d.count);
  }

  const cells: HeatmapCell[] = [];
  let recentContributions = 0;
  const cursor = new Date(startDate);
  let weekIndex = 0;

  while (cursor <= todayDate) {
    const dayOfWeek = mondayBasedDay(cursor);
    if (dayOfWeek === 0 && cells.length > 0) weekIndex++;
    const dateStr = dateToString(cursor);
    const count = countMap.get(dateStr) ?? 0;
    recentContributions += count;
    cells.push({ date: dateStr, dayOfWeek, weekIndex, count, level: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const nonZero = cells.map(c => c.count).filter(c => c > 0).sort((a, b) => a - b);
  if (nonZero.length > 0) {
    const p25 = nonZero[Math.floor(nonZero.length * 0.25)];
    const p50 = nonZero[Math.floor(nonZero.length * 0.5)];
    const p75 = nonZero[Math.floor(nonZero.length * 0.75)];
    for (const cell of cells) {
      if (cell.count === 0) cell.level = 0;
      else if (cell.count <= p25) cell.level = 1;
      else if (cell.count <= p50) cell.level = 2;
      else if (cell.count <= p75) cell.level = 3;
      else cell.level = 4;
    }
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  for (const cell of cells) {
    const month = new Date(cell.date + "T00:00:00").getMonth();
    if (month !== lastMonth && cell.dayOfWeek === 0) {
      monthLabels.push({ label: SHORT_MONTHS[month], weekIndex: cell.weekIndex });
      lastMonth = month;
    }
  }

  return { cells, weekCount: weekIndex + 1, monthLabels, recentContributions };
}
