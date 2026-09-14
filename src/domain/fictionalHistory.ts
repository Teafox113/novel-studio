export interface FictionalDate { year: number; month: number; day: number }
export interface FictionalCalendar { name: string; era: string; months: Array<{ name: string; days: number }>; weekdays: string[] }
export interface FictionalHistory { calendar: FictionalCalendar; dates: Record<string, FictionalDate> }

export function defaultHistory(): FictionalHistory {
  return { calendar: { name: "世界曆", era: "新紀元", months: Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1}月`, days: 30 })), weekdays: ["一", "二", "三", "四", "五", "六", "日"] }, dates: {} };
}
export function validDate(calendar: FictionalCalendar, date: FictionalDate): boolean {
  return Number.isSafeInteger(date.year) && Math.abs(date.year) <= 1000000 && date.year !== 0 && Number.isInteger(date.month) && date.month >= 1 && date.month <= calendar.months.length && Number.isInteger(date.day) && date.day >= 1 && date.day <= calendar.months[date.month - 1].days;
}
export function absoluteDay(calendar: FictionalCalendar, date: FictionalDate): number {
  if (!validDate(calendar, date)) throw new Error("日期超出此曆法範圍（不使用零年）。");
  const yearDays = calendar.months.reduce((total, month) => total + month.days, 0);
  return (date.year > 0 ? date.year - 1 : date.year) * yearDays + calendar.months.slice(0, date.month - 1).reduce((total, month) => total + month.days, 0) + date.day - 1;
}
export function formatFictionalDate(calendar: FictionalCalendar, date: FictionalDate): string {
  const day = absoluteDay(calendar, date);
  const weekday = calendar.weekdays[((day % calendar.weekdays.length) + calendar.weekdays.length) % calendar.weekdays.length];
  return `${calendar.era}${date.year < 0 ? "前" : ""}${Math.abs(date.year)}年 ${calendar.months[date.month - 1].name} ${date.day}日 · ${weekday}`;
}
export function validateHistory(value: unknown): FictionalHistory {
  if (!value || typeof value !== "object") throw new Error("架空歷史資料格式錯誤。");
  const history = value as FictionalHistory;
  const c = history.calendar;
  if (!c || typeof c.name !== "string" || !c.name.trim() || typeof c.era !== "string" || !c.era.trim() || !Array.isArray(c.months) || c.months.length < 1 || c.months.length > 48 || !c.months.every(m => m && typeof m.name === "string" && m.name.trim() && Number.isInteger(m.days) && m.days >= 1 && m.days <= 1000) || !Array.isArray(c.weekdays) || c.weekdays.length < 1 || c.weekdays.length > 30 || !c.weekdays.every(d => typeof d === "string" && d.trim())) throw new Error("請設定曆法名稱、紀元、1–48 個月份（每月 1–1000 日）及 1–30 個週日名稱。");
  if (!history.dates || typeof history.dates !== "object" || Array.isArray(history.dates) || !Object.values(history.dates).every(d => d && validDate(c, d))) throw new Error("曆法變更會使既有事件日期無效，請先調整事件日期。");
  return structuredClone(history);
}
