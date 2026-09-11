import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { BrowserProjectRepository } from "./browserProjectRepository";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("BrowserProjectRepository", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips the active project", async () => {
    const repository = new BrowserProjectRepository();
    await repository.save(sampleProject);

    const loaded = await repository.load();
    expect(loaded?.id).toBe(sampleProject.id);
    expect(loaded?.title).toBe("霧港十三夜");
  });

  it("keeps at most twenty recent snapshots", async () => {
    const repository = new BrowserProjectRepository();

    for (let index = 0; index < 22; index += 1) {
      await repository.createSnapshot(sampleProject, `快照 ${index}`);
    }

    const snapshots = JSON.parse(
      storage.getItem("novel-studio.snapshots.v1") ?? "[]",
    ) as Array<{ label: string }>;

    expect(snapshots).toHaveLength(20);
    expect(snapshots[0].label).toBe("快照 21");
    expect(snapshots[19].label).toBe("快照 2");
  });

  it("lists only snapshots that belong to the active project", async () => {
    const repository = new BrowserProjectRepository();
    await repository.createSnapshot(sampleProject, "目前專案");
    await repository.createSnapshot(
      { ...sampleProject, id: "another-project" },
      "其他專案",
    );

    const snapshots = await repository.listSnapshots(sampleProject.id);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].label).toBe("目前專案");
    expect(snapshots[0].project.title).toBe(sampleProject.title);
  });
});
