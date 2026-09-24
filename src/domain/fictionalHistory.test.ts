import { describe, expect, it } from "vitest";
import { absoluteDay, defaultHistory, formatFictionalDate, validDate, validateHistory } from "./fictionalHistory";
import { sampleProject } from "../data/sampleProject";
import { migrateStoryProject } from "./migrations";
import { parsePortableProject, serializePortableProject } from "../portable/projectArchive";
import { compareProjectVersions } from "./snapshotComparison";

describe("fictional chronology", () => {
  it("orders dates across the era boundary without a year zero", () => {
    const { calendar } = defaultHistory();
    expect(absoluteDay(calendar, { year: -1, month: 12, day: 30 })).toBe(-1);
    expect(absoluteDay(calendar, { year: 1, month: 1, day: 1 })).toBe(0);
    expect(validDate(calendar, { year: 0, month: 1, day: 1 })).toBe(false);
    expect(formatFictionalDate(calendar, { year: -1, month: 12, day: 30 })).toContain("前1年");
    expect(formatFictionalDate(calendar, { year: -1, month: 12, day: 30 })).toContain("· 日");
  });
  it("supports custom month lengths and rejects impossible dates", () => {
    const history = defaultHistory();
    history.calendar.months = [{ name: "霧月", days: 10 }, { name: "潮月", days: 20 }];
    expect(absoluteDay(history.calendar, { year: 2, month: 1, day: 1 })).toBe(30);
    expect(validDate(history.calendar, { year: 1, month: 1, day: 11 })).toBe(false);
    history.dates.event = { year: 1, month: 2, day: 20 };
    expect(validateHistory(history)).toEqual(history);
    history.calendar.months[1].days = 19;
    expect(() => validateHistory(history)).toThrow("既有事件日期無效");
  });
  it("migrates old files and round-trips new calendars and dates", () => {
    const legacy = structuredClone(sampleProject);
    delete legacy.fictionalHistory;
    legacy.schemaVersion = 6;
    const migrated = migrateStoryProject(legacy);
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.fictionalHistory).toEqual(defaultHistory());
    migrated.fictionalHistory!.calendar.name = "王朝曆";
    migrated.fictionalHistory!.dates[migrated.timelineEvents[0].id] = { year: -12, month: 2, day: 9 };
    const restored = parsePortableProject(serializePortableProject(migrated));
    expect(restored.fictionalHistory).toEqual(migrated.fictionalHistory);
    expect(compareProjectVersions(sampleProject, restored).some(c => c.category === "架空歷史")).toBe(true);
  });
  it("rejects malformed calendar imports", () => {
    const history = defaultHistory(); history.calendar.weekdays = [];
    expect(() => migrateStoryProject({ ...sampleProject, fictionalHistory: history })).toThrow();
  });
});
