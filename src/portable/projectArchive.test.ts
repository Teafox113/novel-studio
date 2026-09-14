import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import {
  parsePortableProject,
  portableProjectFileName,
  serializePortableProject,
} from "./projectArchive";
import { migrateStoryProject } from "../domain/migrations";

describe("portable project archive", () => {
  it("round-trips a complete project", () => {
    const restored = parsePortableProject(serializePortableProject(sampleProject));
    expect(restored).toEqual(sampleProject);
  });

  it("rejects unrelated JSON", () => {
    expect(() => parsePortableProject('{"hello":"world"}')).toThrow(
      "這不是 Novel Studio 專案檔",
    );
  });

  it("creates a Windows-safe file name", () => {
    expect(portableProjectFileName(' 星海：「歸途」? ')).toBe(
      "星海：「歸途」-.novel",
    );
  });

  it("exports the current schema after migration", () => {
    const migrated = migrateStoryProject({
      ...sampleProject,
      schemaVersion: 1,
      entityRelations: undefined,
      tags: undefined,
      tagLinks: undefined,
      sceneEntityLinks: undefined,
      inspirations: undefined,
      timelineEvents: undefined,
      researchItems: undefined,
      aiFindings: undefined,
    });

    const restored = parsePortableProject(serializePortableProject(migrated));
    expect(restored.schemaVersion).toBe(7);
  });

  it("keeps embedded research attachments in the portable project", () => {
    const project = structuredClone(sampleProject);
    project.researchItems[0] = {
      ...project.researchItems[0],
      kind: "document",
      originalFileName: "notes.txt",
      mediaType: "text/plain",
      byteSize: 4,
      dataUrl: "data:text/plain;base64,dGVzdA==",
    };

    const restored = parsePortableProject(serializePortableProject(project));
    expect(restored.researchItems[0].dataUrl).toBe(
      "data:text/plain;base64,dGVzdA==",
    );
  });
});
