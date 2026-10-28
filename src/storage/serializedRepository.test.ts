import { expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import type { ProjectRepository } from "../domain/models";
import { serializedRepository } from "./serializedRepository";

it("finishes an older save before a restore and snapshots input when enqueued", async () => {
  const writes: string[] = [];
  let finish!: () => void;
  const source = { kind: "browser", label: "test", save: async (p: typeof sampleProject) => {
    if (p.title === "old") await new Promise<void>(resolve => { finish = resolve; });
    writes.push(p.title);
  } } as ProjectRepository;
  const repo = serializedRepository(source);
  const old = { ...sampleProject, title: "old" };
  const a = repo.save(old); old.title = "mutated";
  const b = repo.save({ ...sampleProject, title: "restored" });
  await Promise.resolve(); expect(writes).toEqual([]);
  finish(); await Promise.all([a,b]); expect(writes).toEqual(["old", "restored"]);
});
it("surfaces failures and allows the next queued operation to recover", async () => {
  let calls = 0;
  const repo = serializedRepository({ save: async () => { if (++calls === 1) throw new Error("disk full"); } } as unknown as ProjectRepository);
  await expect(repo.save(sampleProject)).rejects.toThrow("disk full");
  await expect(repo.save(sampleProject)).resolves.toBeUndefined();
});
