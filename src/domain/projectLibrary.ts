import type { StoryProject } from "./models";
import { defaultHistory } from "./fictionalHistory";

export function createBlankProject(title: string, author: string): StoryProject {
  if (!title.trim()) throw new Error("請填寫小說名稱。");
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  return {
    schemaVersion: 7, fictionalHistory: defaultHistory(), id: crypto.randomUUID(), title: title.trim(), author: author.trim(), subtitle: "", updatedAt: now,
    nodes: [{ id: crypto.randomUUID(), parentId: null, kind: "scene", title: "第一章", synopsis: "", status: "構思", sortOrder: 0, wordCount: 0, documentId, updatedAt: now }],
    documents: { [documentId]: { id: documentId, content: { type: "doc", content: [{ type: "paragraph" }] }, plainText: "", revision: 1, updatedAt: now } },
    entities: [], entityRelations: [], tags: [], tagLinks: [], sceneEntityLinks: [], inspirations: [], timelineEvents: [], researchItems: [], aiFindings: [],
  };
}

export function duplicateProject(project: StoryProject, title: string): StoryProject {
  if (!title.trim()) throw new Error("請填寫副本名稱。");
  return { ...structuredClone(project), id: crypto.randomUUID(), title: title.trim(), updatedAt: new Date().toISOString() };
}
