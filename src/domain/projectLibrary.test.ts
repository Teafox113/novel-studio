import { describe, expect, it } from "vitest";
import { createBlankProject, duplicateProject } from "./projectLibrary";
import { parsePortableProject, serializePortableProject } from "../portable/projectArchive";
import { sampleProject } from "../data/sampleProject";

describe("project library", () => {
  it("creates independent blank novels that can round-trip through portable archives", () => {
    const first = createBlankProject(" 新小說 ", "作者");
    const second = createBlankProject("另一部", "");
    expect(first.id).not.toBe(second.id);
    expect(first.nodes[0].id).not.toBe(second.nodes[0].id);
    const loaded = parsePortableProject(serializePortableProject(first));
    expect(loaded.title).toBe("新小說");
    expect(Object.values(loaded.documents)[0].plainText).toBe("");
    expect(loaded.entities).toHaveLength(0);
  });
  it("duplicates content without sharing mutable objects or the project identity", () => {
    const copy = duplicateProject(sampleProject, "副本");
    expect(copy.id).not.toBe(sampleProject.id);
    expect(copy.documents).toEqual(sampleProject.documents);
    copy.nodes[0].title = "改寫";
    expect(sampleProject.nodes[0].title).not.toBe("改寫");
  });
  it("rejects empty names", () => {
    expect(() => createBlankProject(" ", "")).toThrow();
    expect(() => duplicateProject(sampleProject, " ")).toThrow();
  });
});
