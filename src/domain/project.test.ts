import { describe, expect, it } from "vitest";
import { countWords, moveSibling } from "./project";
import type { ProjectNode } from "./models";

describe("countWords", () => {
  it("counts Chinese characters and Latin words", () => {
    expect(countWords("霧城醒來 hello world")).toBe(6);
  });
});

describe("moveSibling", () => {
  const base: ProjectNode[] = [
    {
      id: "a",
      parentId: "root",
      kind: "scene",
      title: "A",
      synopsis: "",
      status: "草稿",
      sortOrder: 0,
      wordCount: 0,
      updatedAt: "",
    },
    {
      id: "b",
      parentId: "root",
      kind: "scene",
      title: "B",
      synopsis: "",
      status: "草稿",
      sortOrder: 1,
      wordCount: 0,
      updatedAt: "",
    },
  ];

  it("swaps two adjacent siblings", () => {
    const moved = moveSibling(base, "b", -1);
    expect(moved.find((node) => node.id === "b")?.sortOrder).toBe(0);
    expect(moved.find((node) => node.id === "a")?.sortOrder).toBe(1);
  });
});
