import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { analyzeProjectLocally, mergeAiFindings, suggestSceneSummary } from "./localAnalyzer";

describe("local AI analyzer", () => {
  it("creates a concise scene summary candidate", () => {
    expect(
      suggestSceneSummary("場景標題\n第一句發生了事件。第二句帶來後果。第三句結束。", "場景標題"),
    ).toBe("第一句發生了事件。第二句帶來後果。");
  });

  it("detects missing story time and unlinked entity mentions", () => {
    const findings = analyzeProjectLocally(sampleProject, "2026-01-01T00:00:00Z");
    expect(findings.some((item) => item.fingerprint.startsWith("missing-story-time:"))).toBe(true);
    expect(
      findings.some(
        (item) =>
          item.action.type === "add-scene-entity-link" &&
          item.action.entityId === "entity-harbor",
      ),
    ).toBe(true);
  });

  it("finds an age fact candidate and detects conflicting ages", () => {
    const candidateProject = structuredClone(sampleProject);
    candidateProject.documents["doc-1"].plainText += "\n林晝今年二十七歲。\n林晝 27 歲。";
    let findings = analyzeProjectLocally(candidateProject);
    expect(findings.some((item) => item.action.type === "set-entity-attribute")).toBe(true);

    candidateProject.documents["doc-2"].plainText += "\n林晝已經 28 歲。";
    findings = analyzeProjectLocally(candidateProject);
    expect(findings.some((item) => item.severity === "error" && item.kind === "consistency")).toBe(true);
  });

  it("keeps reviewed decisions when rescanning", () => {
    const detected = analyzeProjectLocally(sampleProject);
    const dismissed = { ...detected[0], status: "dismissed" as const, reviewedAt: "now" };
    const merged = mergeAiFindings([dismissed], detected);
    expect(merged.filter((item) => item.fingerprint === dismissed.fingerprint)).toEqual([dismissed]);
  });
});
