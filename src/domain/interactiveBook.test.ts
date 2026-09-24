import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { backBook, bookProblems, chooseBook, initialBook, startBook, syncBook, validateInteractiveBook } from "./interactiveBook";
import { parsePortableProject, serializePortableProject } from "../portable/projectArchive";
import { duplicateProject } from "./projectLibrary";
import { compareProjectVersions } from "./snapshotComparison";

function fixture() {
  const project = structuredClone(sampleProject);
  const book = initialBook(project);
  for (const b of book.blocks) b.mode = "ending";
  const [a, b, c] = book.blocks;
  a.mode = "choices";
  a.choices = [{ id: "take", text: "拿走鑰匙", targetId: b.sceneId }, { id: "leave", text: "離開", targetId: c.sceneId }];
  return { project, book, a, b, c };
}
describe("numbered interactive book", () => {
  it("keeps numbers after reorder and does not reuse removed scene numbers", () => {
    const { project, book, a } = fixture();
    project.nodes.reverse(); project.nodes.forEach(n => n.sortOrder += 10);
    expect(syncBook(project, book)).toBe(book);
    project.nodes = project.nodes.filter(n => n.id !== a.sceneId);
    project.nodes.push({ ...project.nodes.find(n => n.kind === "scene")!, id: "new-scene" });
    const next = syncBook(project, book);
    expect(next.blocks.find(b => b.sceneId === "new-scene")?.number).toBe(book.nextNumber);
    expect(next.blocks.find(b => b.sceneId === a.sceneId)?.number).toBe(a.number);
  });
  it("runs two branches and restores exact position on back without mutating source", () => {
    const { project, book, a, b, c } = fixture();
    const session = startBook(project, book);
    const next = chooseBook(session, "take");
    expect(next.path).toEqual([a.sceneId, b.sceneId]);
    const back = backBook(next);
    expect(back.path).toEqual([a.sceneId]);
    expect(chooseBook(back, "leave").path.at(-1)).toBe(c.sceneId);
    expect(session.path).toEqual([a.sceneId]);
    expect(project.interactiveBook).toBeUndefined();
  });
  it("keeps preview content fixed when author edits or deletes a scene", () => {
    const { project, book, b } = fixture();
    const session = startBook(project, book);
    const title = session.blocks.find(x => x.sceneId === b.sceneId)!.title;
    project.nodes = project.nodes.filter(n => n.id !== b.sceneId);
    book.blocks[0].choices[0].targetId = "missing";
    expect(chooseBook(session, "take").blocks.find(x => x.sceneId === b.sceneId)!.title).toBe(title);
  });
  it("blocks missing start, dangling choices and empty labels", () => {
    const { project, book, a } = fixture();
    book.startId = "missing"; a.choices[0] = { id: "broken", text: " ", targetId: "missing" };
    expect(bookProblems(project, book)).toHaveLength(3);
    expect(() => startBook(project, book)).toThrow();
  });
  it("honors the active mode while preserving inactive choices", () => {
    const { project, book, a, b } = fixture();
    a.mode = "continue"; a.targetId = b.sceneId;
    const session = startBook(project, book);
    expect(() => chooseBook(session, "take")).toThrow();
    expect(chooseBook(session, `continue:${a.sceneId}`).path.at(-1)).toBe(b.sceneId);
    a.mode = "ending";
    expect(startBook(project, book).blocks[0].choices).toEqual([]);
    expect(a.choices).toHaveLength(2);
  });
  it("preserves numbering and choices in archives, copies and snapshot comparison", () => {
    const { project, book } = fixture(); project.interactiveBook = book;
    const restored = parsePortableProject(serializePortableProject(project));
    expect(restored.schemaVersion).toBe(10);
    expect(restored.interactiveBook).toEqual(book);
    const copy = duplicateProject(restored, "副本"); copy.interactiveBook!.enabled = false;
    expect(restored.interactiveBook!.enabled).toBe(true);
    expect(compareProjectVersions(restored, copy).some(c => c.category === "互動書籍")).toBe(true);
  });
  it("rejects duplicate numbers, IDs and invalid counters on import", () => {
    const { book } = fixture();
    expect(() => validateInteractiveBook({ ...book, nextNumber: 1 })).toThrow();
    const bad = structuredClone(book); bad.blocks[1].number = bad.blocks[0].number;
    expect(() => validateInteractiveBook(bad)).toThrow();
    const duplicate = structuredClone(book); duplicate.blocks[0].choices.push(duplicate.blocks[0].choices[0]);
    expect(() => validateInteractiveBook(duplicate)).toThrow();
  });
  it("disabling retains branches but prevents reading, and revisits remain finite user steps", () => {
    const { project, book, a } = fixture(); a.choices[0].targetId = a.sceneId;
    const s = chooseBook(startBook(project, book), "take");
    expect(s.path).toEqual([a.sceneId, a.sceneId]);
    expect(backBook(s).path).toEqual([a.sceneId]);
    book.enabled = false; expect(() => startBook(project, book)).toThrow();
    expect(book.blocks[0].choices).toHaveLength(2);
  });
});
