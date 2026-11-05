import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { importBrowserCaptures, parseBrowserCaptures, type BrowserCapture } from "./browserCapture";

const quote: BrowserCapture = { id: "capture-test-01", kind: "quote", title: "港口史料", text: "港口在冬季結冰。", url: "https://example.com/history", note: "給第三章使用", createdAt: "2026-11-05T00:00:00Z" };
const pack = (entries: unknown[], version = 1) => JSON.stringify({ format: "novel-studio-capture", version, entries });
describe("browser capture import", () => {
  it("preserves sources and maps personal notes to sticky notes", () => {
    const entries = parseBrowserCaptures(pack([quote, { ...quote, id: "capture-test-02", kind: "note", url: "" }]));
    const next = importBrowserCaptures(sampleProject, entries);
    expect(next.researchItems.at(-1)).toMatchObject({ summary: quote.text, notes: quote.note, sourceUrl: quote.url, citation: { accessedAt: "2026-11-05" } });
    expect(next.inspirations.at(-1)).toMatchObject({ id: "sticky-capture-capture-test-02", kind: "note", content: `${quote.text}\n\n${quote.note}` });
    expect(next.nodes).toBe(sampleProject.nodes);
  });
  it("skips repeated imports without overwriting edited material", () => {
    const next = importBrowserCaptures(sampleProject, [quote]);
    next.researchItems.at(-1)!.summary = "已整理的內容";
    expect(importBrowserCaptures(next, [quote])).toBe(next);
    expect(importBrowserCaptures(sampleProject, [quote, quote]).researchItems.length).toBe(sampleProject.researchItems.length + 1);
  });
  it.each([
    { ...quote, url: "javascript:alert(1)" }, { ...quote, url: "file:///secret" },
    { ...quote, url: "" }, { ...quote, text: " " }, { ...quote, text: "x".repeat(20001) },
    { ...quote, createdAt: "invalid" }, { ...quote, id: "../escape" }, { ...quote, kind: "script" },
    { ...quote, note: null }, null,
  ])("rejects invalid entries before any mutation", entry => {
    expect(() => parseBrowserCaptures(pack([quote, entry]))).toThrow();
  });
  it("rejects malformed files, future formats, duplicate ids and excessive sizes", () => {
    for (const source of ["broken", "null", pack([quote], 2), pack([quote, quote]), pack(Array(201).fill(quote)), " ".repeat(5 * 1024 * 1024 + 1)]) expect(() => parseBrowserCaptures(source)).toThrow();
  });
});
