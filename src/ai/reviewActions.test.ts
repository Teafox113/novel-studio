import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { analyzeProjectLocally } from "./localAnalyzer";
import { applyAiReview } from "./reviewActions";

describe("AI review actions", () => {
  it("applies an approved entity link exactly once", () => {
    const findings = analyzeProjectLocally(sampleProject);
    const candidate = findings.find(
      (item) => item.action.type === "add-scene-entity-link",
    );
    expect(candidate).toBeDefined();
    const project = { ...structuredClone(sampleProject), aiFindings: findings };
    const applied = applyAiReview(
      project,
      candidate!,
      "accepted",
      "2026-01-01T00:00:00Z",
      () => "approved-link",
    );
    expect(applied.sceneEntityLinks.some((link) => link.id === "approved-link")).toBe(true);
    expect(applied.aiFindings.find((item) => item.id === candidate!.id)?.status).toBe("accepted");
    const appliedAgain = applyAiReview(applied, candidate!, "accepted", "later", () => "duplicate");
    expect(appliedAgain.sceneEntityLinks.some((link) => link.id === "duplicate")).toBe(false);
  });

  it("does not mutate project data when a candidate is dismissed", () => {
    const findings = analyzeProjectLocally(sampleProject);
    const candidate = findings[0];
    const project = { ...structuredClone(sampleProject), aiFindings: findings };
    const dismissed = applyAiReview(project, candidate, "dismissed", "now");
    expect(dismissed.nodes).toEqual(project.nodes);
    expect(dismissed.entities).toEqual(project.entities);
    expect(dismissed.sceneEntityLinks).toEqual(project.sceneEntityLinks);
    expect(dismissed.aiFindings.find((item) => item.id === candidate.id)?.status).toBe("dismissed");
  });
});
