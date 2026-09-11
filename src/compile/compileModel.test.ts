import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { compileProject, defaultCompileOptions } from "./compileModel";

describe("compileProject", () => {
  it("assembles volumes and scenes in Binder order", () => {
    const book = compileProject(sampleProject, defaultCompileOptions(sampleProject));
    expect(book.volumes.map((volume) => volume.id)).toEqual(["volume-1", "volume-2"]);
    expect(book.volumes[0].scenes.map((scene) => scene.id)).toEqual([
      "scene-1",
      "scene-2",
      "scene-3",
    ]);
    expect(book.sceneCount).toBe(4);
  });

  it("filters draft statuses without modifying the project", () => {
    const options = {
      ...defaultCompileOptions(sampleProject),
      includedStatuses: ["完成"] as const,
    };
    const book = compileProject(sampleProject, {
      ...options,
      includedStatuses: [...options.includedStatuses],
    });
    expect(book.sceneCount).toBe(0);
    expect(sampleProject.nodes).toHaveLength(7);
  });
});
