import { describe, expect, it } from "vitest";
import { migrateStoryProject } from "./migrations";

const legacyProject = {
  schemaVersion: 1,
  id: "legacy-project",
  title: "舊版小說",
  subtitle: "",
  author: "作者",
  nodes: [
    {
      id: "legacy-scene",
      parentId: null,
      kind: "scene",
      title: "舊場景",
      synopsis: "",
      status: "構思",
      pov: "古老旅人",
      location: "無名車站",
      sortOrder: 0,
      wordCount: 0,
      documentId: "legacy-document",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  documents: {
    "legacy-document": {
      id: "legacy-document",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      plainText: "",
      revision: 1,
      updatedAt: "2026-01-01T00:00:00Z",
    },
  },
  entities: [],
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("migrateStoryProject", () => {
  it("upgrades text POV and location into stable entity links", () => {
    const migrated = migrateStoryProject(legacyProject);

    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.researchItems.every((item) => Array.isArray(item.linkedInspirationIds))).toBe(true);
    expect(migrated.entities.map((entity) => entity.name)).toEqual([
      "古老旅人",
      "無名車站",
    ]);
    expect(migrated.sceneEntityLinks).toHaveLength(2);
    expect(migrated.sceneEntityLinks.map((link) => link.role).sort()).toEqual([
      "location",
      "pov",
    ]);
    expect(migrated.inspirations).toEqual([]);
    expect(migrated.tags).toEqual([]);
    expect(migrated.timelineEvents).toHaveLength(1);
    expect(migrated.timelineEvents[0].linkedNodeIds).toEqual(["legacy-scene"]);
    expect(migrated.researchItems).toEqual([]);
    expect(migrated.aiFindings).toEqual([]);
  });

  it("uses deterministic identifiers when migrating the same project twice", () => {
    const first = migrateStoryProject(legacyProject);
    const second = migrateStoryProject(legacyProject);

    expect(second.entities.map((entity) => entity.id)).toEqual(
      first.entities.map((entity) => entity.id),
    );
    expect(second.sceneEntityLinks.map((link) => link.id)).toEqual(
      first.sceneEntityLinks.map((link) => link.id),
    );
    expect(second.timelineEvents.map((event) => event.id)).toEqual(
      first.timelineEvents.map((event) => event.id),
    );
  });
});
