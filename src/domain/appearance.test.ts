import { describe, expect, it } from "vitest";
import { manuscriptCssSize, readEditorSize, readFont, readScale, uiScales } from "./appearance";

describe("appearance preferences", () => {
  it("keeps manuscript screen size independent of every UI scale", () => {
    for (const scale of uiScales) for (const size of [15, 24, 36]) {
      expect(manuscriptCssSize(size, scale) * scale / 100).toBeCloseTo(size);
    }
  });
  it("recovers invalid or missing stored preferences", () => {
    expect(readFont("__proto__", "serif")).toBe("serif");
    expect(readFont("mono", "serif")).toBe("mono");
    expect(readScale("0")).toBe(100);
    expect(readScale("175")).toBe(175);
    expect(readEditorSize(null)).toBe(20);
    expect(readEditorSize("NaN")).toBe(20);
    expect(readEditorSize("Infinity")).toBe(20);
    expect(readEditorSize("99")).toBe(36);
    expect(readEditorSize("2")).toBe(15);
  });
});
