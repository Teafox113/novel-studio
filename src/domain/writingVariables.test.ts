import { describe, expect, it } from "vitest";
import { collectVariable, sourceText, validateWritingVariables } from "./writingVariables";
import { sampleProject } from "../data/sampleProject";
import { parsePortableProject, serializePortableProject } from "../portable/projectArchive";
import { duplicateProject } from "./projectLibrary";
import { compareProjectVersions } from "./snapshotComparison";

const source = { id: "source-one", sceneId: "scene", documentId: "doc", quote: "鑰匙", context: "他得到鑰匙。" };
describe("deferred writing variables", () => {
  it("collects pending ideas without inventing item effects", () => {
    const result = collectVariable([], " 鑰匙 ", source);
    expect(result.variables[0]).toMatchObject({ name: "鑰匙", status: "pending", kind: "pending", initial: 0 });
    expect(result.variables[0].sources).toEqual([source]);
  });
  it("reuses names and explicit references without duplicating an occurrence", () => {
    const first = collectVariable([], "鑰匙", source);
    const same = collectVariable(first.variables, "鑰匙", source);
    expect(same.variables).toHaveLength(1); expect(same.variables[0].sources).toHaveLength(1);
    const next = collectVariable(same.variables, "那把鑰匙", { ...source, id: "two" }, first.variableId);
    expect(next.variables[0].sources).toHaveLength(2);
    expect(() => collectVariable([], "鑰匙", source, "missing")).toThrow();
  });
  it("rejects malformed settings and ready variables without a type", () => {
    const v = collectVariable([], "鑰匙", source).variables[0];
    expect(() => validateWritingVariables([{ ...v, status: "ready" }])).toThrow();
    expect(() => validateWritingVariables([{ ...v, kind: "item", initial: -1 }])).toThrow();
    expect(() => validateWritingVariables([{ ...v, kind: "knowledge", initial: 3 }])).toThrow();
    expect(() => validateWritingVariables([{ ...v, sources: [source, source] }])).toThrow();
  });
  it("follows explicit text marks rather than guessing identical words", () => {
    const doc = { type: "doc", content: [{ type: "text", text: "鑰匙" }, { type: "text", text: "黃銅", marks: [{ type: "variableReference", attrs: { sourceId: source.id } }] }, { type: "text", text: "鑰匙", marks: [{ type: "variableReference", attrs: { sourceId: source.id } }] }] };
    expect(sourceText(doc, source.id)).toBe("黃銅鑰匙");
    expect(sourceText(doc, "deleted")).toBe("");
  });
  it("preserves sources, marks and settings through archives and independent copies", () => {
    const project = structuredClone(sampleProject);
    project.writingVariables = collectVariable([], "鑰匙", source).variables;
    const doc = Object.values(project.documents)[0];
    doc.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "鑰匙", marks: [{ type: "variableReference", attrs: { sourceId: source.id, variableId: project.writingVariables[0].id } }] }] }] };
    const restored = parsePortableProject(serializePortableProject(project));
    expect(restored.schemaVersion).toBe(10);
    expect(restored.writingVariables).toEqual(project.writingVariables);
    expect(sourceText(restored.documents[doc.id].content, source.id)).toBe("鑰匙");
    const copy = duplicateProject(restored, "副本"); copy.writingVariables![0].notes = "補充";
    expect(restored.writingVariables![0].notes).toBe("");
    expect(compareProjectVersions(restored, copy).some(c => c.category === "變數庫")).toBe(true);
  });
});
