import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import type { StoryProject } from "./models";
import { compareProjectVersions } from "./snapshotComparison";

describe("snapshot comparison", () => {
  it("ignores timestamps, revision counters and cached word counts", () => {
    const current = structuredClone(sampleProject);
    current.updatedAt = "later";
    current.nodes[0].updatedAt = "later";
    current.nodes[0].wordCount += 10;
    Object.values(current.documents).forEach(doc => { doc.revision++; doc.updatedAt = "later"; });
    expect(compareProjectVersions(sampleProject, current)).toEqual([]);
  });
  it("compares backup to current and reports added and deleted nodes", () => {
    const current = structuredClone(sampleProject);
    const removed = current.nodes.shift()!;
    current.nodes.push({ ...removed, id: "new-node", title: "新章" });
    const changes = compareProjectVersions(sampleProject, current);
    expect(changes.map(c => c.kind)).toEqual(["刪除", "新增"]);
    expect(changes[1].title).toBe("新章");
  });
  it("detects body and formatting changes without mutating either project", () => {
    const current = structuredClone(sampleProject);
    const node = current.nodes.find(n => n.documentId)!;
    const doc = current.documents[node.documentId!];
    doc.plainText = "新正文";
    doc.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "新正文", marks: [{ type: "bold" }] }] }] };
    const changes = compareProjectVersions(sampleProject, current);
    expect(changes[0].fields.map(f => f.name)).toEqual(["正文", "內容／格式"]);
    expect(sampleProject.documents[node.documentId!].plainText).not.toBe("新正文");
    const formattingOnly = structuredClone(current);
    formattingOnly.documents[node.documentId!].content.content![0].content![0].marks = [];
    expect(compareProjectVersions(current, formattingOnly)[0].fields.map(f => f.name)).toEqual(["內容／格式"]);
  });
  it("detects project metadata and world edits", () => {
    const current = structuredClone(sampleProject);
    current.author = "新作者";
    current.entities[0].summary = "新的設定";
    expect(compareProjectVersions(sampleProject, current).map(c => c.category)).toEqual(["專案", "世界觀"]);
  });
  it("detects attachment replacement without exposing embedded file data", () => {
    const before = structuredClone(sampleProject);
    const after = structuredClone(sampleProject);
    const item = { id: "attachment", title: "研究圖片", dataUrl: "data:image/png;base64,AAAA" } as StoryProject["researchItems"][number];
    before.researchItems = [item];
    after.researchItems = [{ ...item, dataUrl: "data:image/png;base64,BBBB" }];
    const changes = compareProjectVersions(before, after);
    expect(changes[0].fields[0].name).toBe("附件");
    expect(JSON.stringify(changes)).not.toContain("base64");
  });
});
