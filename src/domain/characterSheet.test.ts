import { describe, expect, it } from "vitest";
import { validateCharacterSheet, type CharacterSheet } from "./characterSheet";
import { sampleProject } from "../data/sampleProject";
import { migrateStoryProject } from "./migrations";
import { duplicateProject } from "./projectLibrary";
import { compareProjectVersions } from "./snapshotComparison";
import { parsePortableProject, serializePortableProject } from "../portable/projectArchive";

const sheet: CharacterSheet = { version: 1, entries: [{ id: "key", category: "item", name: "黃銅鑰匙", value: 1, notes: "開門", entityId: "world-key", sourceSceneId: "scene-1" }] };
describe("character profile persistence", () => {
  it("preserves keywords, references and counts through migration, archive and copies", () => {
    const p = structuredClone(sampleProject);
    p.entities[0].characterSheet = structuredClone(sheet);
    const restored = parsePortableProject(serializePortableProject(migrateStoryProject(p)));
    expect(restored.schemaVersion).toBe(10);
    expect(restored.entities[0].characterSheet).toEqual(sheet);
    const copy = duplicateProject(restored, "副本");
    copy.entities[0].characterSheet!.entries[0].value = 2;
    expect(restored.entities[0].characterSheet!.entries[0].value).toBe(1);
    expect(compareProjectVersions(restored, copy).some(c => c.fields.some(f => f.name === "人物狀態卡"))).toBe(true);
  });
  it("upgrades old projects without inventing character possessions", () => {
    const p = structuredClone(sampleProject); p.schemaVersion = 7;
    expect(migrateStoryProject(p).entities[0].characterSheet).toBeUndefined();
  });
  it("rejects invalid quantities, numeric bounds, duplicate IDs and unsupported versions", () => {
    for (const patch of [{ value: -1 }, { value: 1.5 }, { value: Infinity }, { name: " " }, { maximum: 0 }, { value: 10, maximum: 5 }]) {
      expect(() => validateCharacterSheet({ ...sheet, entries: [{ ...sheet.entries[0], ...patch }] })).toThrow();
    }
    expect(() => validateCharacterSheet({ ...sheet, entries: [sheet.entries[0], sheet.entries[0]] })).toThrow();
    expect(() => validateCharacterSheet({ ...sheet, version: 2 })).toThrow();
  });
  it("retains missing references for repair, but rejects malformed imported cards", () => {
    expect(validateCharacterSheet(sheet).entries[0].entityId).toBe("world-key");
    const p = structuredClone(sampleProject); p.entities[0].characterSheet = { ...sheet, entries: [{ ...sheet.entries[0], value: -1 }] };
    expect(() => parsePortableProject(serializePortableProject(p))).toThrow();
  });
});
