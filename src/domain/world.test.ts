import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import {
  backlinksForEntity,
  filterWorldEntities,
  relationsForEntity,
} from "./world";

describe("world helpers", () => {
  it("searches names, summaries, aliases and attributes", () => {
    const entity = {
      ...sampleProject.entities[0],
      aliases: ["阿晝"],
      attributes: { occupation: "書店主人" },
    };

    expect(filterWorldEntities([entity], "阿晝", "all")).toHaveLength(1);
    expect(filterWorldEntities([entity], "書店主人", "character")).toHaveLength(1);
    expect(filterWorldEntities([entity], "林晝", "location")).toHaveLength(0);
  });

  it("returns incoming and outgoing relationships", () => {
    const relations = relationsForEntity(
      sampleProject.entityRelations,
      "entity-harbor",
    );
    expect(relations.map((relation) => relation.id)).toContain(
      "relation-lin-harbor",
    );
  });

  it("collects scene and inspiration backlinks without duplicate scenes", () => {
    const links = backlinksForEntity(sampleProject, "entity-lin");
    expect(links.sceneIds).toContain("scene-1");
    expect(links.inspirationIds).toContain("idea-dialogue-father");
    expect(backlinksForEntity(sampleProject, "entity-harbor").researchIds).toContain(
      "research-harbor-fog",
    );
  });
});
