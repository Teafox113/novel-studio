import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { parseSearchQuery, searchProject } from "./projectSearch";

describe("project search", () => {
  it("parses quoted terms and type filters", () => {
    expect(parseSearchQuery('type:人物 "林 晝" #皇室')).toEqual({
      terms: ["林 晝", "皇室"],
      type: "entity",
    });
  });

  it("finds a scene by full text and returns a useful excerpt", () => {
    const project = structuredClone(sampleProject);
    project.documents["doc-1"].plainText += "\n銀色懷錶在雨聲中停止。";
    const results = searchProject(project, "銀色懷錶");
    expect(results[0]).toMatchObject({ kind: "scene", targetId: "scene-1" });
    expect(results[0].matchedFields).toContain("正文");
    expect(results[0].excerpt).toContain("銀色懷錶");
  });

  it("searches aliases, attributes and relations in the world bible", () => {
    const project = structuredClone(sampleProject);
    const entity = project.entities[0];
    entity.aliases.push("灰塔醫師");
    entity.attributes["信物"] = "銀色懷錶";
    expect(searchProject(project, "灰塔醫師")[0]).toMatchObject({
      kind: "entity",
      targetId: entity.id,
    });
    expect(searchProject(project, "銀色懷錶")[0].matchedFields).toContain("屬性");
  });

  it("uses linked tags to find their attached content", () => {
    const project = structuredClone(sampleProject);
    project.tags.push({
      id: "tag-secret",
      name: "皇室機密",
      category: "story",
      color: "#000",
      createdAt: project.updatedAt,
    });
    project.tagLinks.push({
      id: "tag-link-secret",
      tagId: "tag-secret",
      targetType: "scene",
      targetId: "scene-1",
      createdAt: project.updatedAt,
    });
    const results = searchProject(project, "#皇室機密");
    expect(results[0]).toMatchObject({ kind: "scene", targetId: "scene-1" });
    expect(results[0].matchedFields).toContain("Tag");
  });

  it("requires every term and respects an explicit kind filter", () => {
    const project = structuredClone(sampleProject);
    project.researchItems[0].title = "北港 航海圖";
    expect(searchProject(project, "北港 航海圖", "research")).toHaveLength(1);
    expect(searchProject(project, "北港 不存在", "research")).toHaveLength(0);
    expect(searchProject(project, "北港", "entity").every((item) => item.kind === "entity")).toBe(true);
  });
});
