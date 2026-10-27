import { describe, expect, it, vi } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { parsePortableProject } from "../portable/projectArchive";
import { FolderBackupRunner } from "./folderBackup";

describe("folder backup", () => {
  it("writes recoverable archives to both destinations and skips unchanged content", async () => {
    const runner = new FolderBackupRunner(), write = vi.fn(async () => "backup.novel"), report = vi.fn();
    const config = { local: "D:/Books", drive: "G:/My Drive/Books" };
    await runner.run(sampleProject, config, write, report);
    expect(write).toHaveBeenCalledTimes(2);
    expect(parsePortableProject((write.mock.calls as unknown as [string, string][])[0][1]).id).toBe(sampleProject.id);
    await runner.run(sampleProject, config, write, report);
    expect(write).toHaveBeenCalledTimes(2);
    await runner.run({ ...sampleProject, title: "新版" }, config, write, report);
    expect(write).toHaveBeenCalledTimes(4);
  });
  it("retries only failed destinations and does not report cloud confirmation", async () => {
    const runner = new FolderBackupRunner(), report = vi.fn();
    let fail = true;
    const write = vi.fn(async (slot: string) => { if (slot === "drive" && fail) throw new Error("離線"); return "backup.novel"; });
    const config = { local: "D:/Books", drive: "G:/Books" };
    await runner.run(sampleProject, config, write, report);
    expect(report.mock.calls.at(-1)?.[1].error).toBe(true);
    fail = false;
    await runner.run(sampleProject, config, write, report);
    expect(write.mock.calls.map(c => c[0])).toEqual(["local", "drive", "drive"]);
    expect(report.mock.calls.at(-1)?.[1].message).toContain("雲端進度請查看");
  });
  it("honors disconnects, destination changes and manual backups", async () => {
    const runner = new FolderBackupRunner(), write = vi.fn(async () => "ok"), report = vi.fn();
    await runner.run(sampleProject, { local: null, drive: null }, write, report);
    expect(write).not.toHaveBeenCalled();
    await runner.run(sampleProject, { local: "A", drive: null }, write, report);
    await runner.run(sampleProject, { local: "B", drive: null }, write, report);
    await runner.run(sampleProject, { local: "B", drive: null }, write, report, true);
    expect(write).toHaveBeenCalledTimes(3);
  });
  it("keeps sticky notes in the recoverable backup", async () => {
    const project = structuredClone(sampleProject);
    project.inspirations.push({ id: "sticky-test", title: "伏筆", content: "最後一章揭曉", kind: "note", status: "inbox", linkedNodeIds: [], linkedEntityIds: [], createdAt: project.updatedAt, updatedAt: project.updatedAt });
    const write = vi.fn(async (_slot: string, content: string) => {
      const restored = parsePortableProject(content);
      expect(restored.inspirations.find(n => n.id === "sticky-test")?.content).toBe("最後一章揭曉");
      return "ok";
    });
    await new FolderBackupRunner().run(project, { local: "A", drive: "B" }, write, vi.fn());
    expect(write).toHaveBeenCalledTimes(2);
  });
  it("does not overlap automatic and manual runs", async () => {
    const runner = new FolderBackupRunner();
    let finish!: (name: string) => void;
    const write = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const config = { local: "A", drive: null };
    const first = runner.run(sampleProject, config, write, vi.fn());
    await runner.run(sampleProject, config, write, vi.fn(), true);
    expect(write).toHaveBeenCalledTimes(1);
    finish("ok"); await first;
  });
});
