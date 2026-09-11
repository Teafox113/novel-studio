import { describe, expect, it } from "vitest";
import { researchKindForFile } from "./researchFiles";

describe("research file classification", () => {
  it("recognizes PDFs and images by media type or extension", () => {
    expect(researchKindForFile("notes.PDF")).toBe("pdf");
    expect(researchKindForFile("map.bin", "image/png")).toBe("image");
  });

  it("keeps other references as documents", () => {
    expect(researchKindForFile("interview.docx")).toBe("document");
  });
});
