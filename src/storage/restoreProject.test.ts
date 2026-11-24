import { expect, it, vi } from "vitest";
import { sampleProject } from "../data/sampleProject";
import type { ProjectRepository } from "../domain/models";
import { restoreProject } from "./restoreProject";

it("backs up both affected works before restoring a different project", async () => {
  const current = { ...sampleProject, id: "A", title: "正在寫的作品" };
  const existing = { ...sampleProject, id: "B", title: "另一部作品最新版" };
  const incoming = { ...existing, title: "另一部作品舊備份" };
  const operations: string[] = [];
  const repo = {
    createSnapshot: vi.fn(async p => { operations.push(`snapshot:${p.title}`); }),
    loadProject: vi.fn(async () => existing),
    save: vi.fn(async p => { operations.push(`save:${p.title}`); }),
  } as unknown as ProjectRepository;
  expect(await restoreProject(repo, current, incoming, "還原前")).toEqual(incoming);
  expect(operations).toEqual(["snapshot:正在寫的作品", "snapshot:另一部作品最新版", "save:另一部作品舊備份"]);
});

it.each([1, 2])("stops restore when recovery snapshot %i fails", async failAt => {
  let calls = 0;
  const save = vi.fn();
  const repo = {
    createSnapshot: async () => { if (++calls === failAt) throw new Error("disk full"); },
    loadProject: async () => sampleProject, save,
  } as unknown as ProjectRepository;
  await expect(restoreProject(repo, { ...sampleProject, id: "other" }, sampleProject, "before")).rejects.toThrow("disk full");
  expect(save).not.toHaveBeenCalled();
});

it("propagates restore write failures without changing the input", async () => {
  const before = structuredClone(sampleProject);
  const repo = { createSnapshot: async () => {}, save: async () => { throw new Error("read only"); } } as unknown as ProjectRepository;
  await expect(restoreProject(repo, sampleProject, sampleProject, "before")).rejects.toThrow("read only");
  expect(sampleProject).toEqual(before);
});
