import type {
  AiFinding,
  ProjectNode,
  ResearchItem,
  RichTextDocument,
  StoryDocument,
  StoryEntity,
  StoryProject,
  TimelineEvent,
} from "../domain/models";
import { migrateStoryProject } from "../domain/migrations";
import { version } from "../../package.json";

export const PORTABLE_PROJECT_FORMAT = "novel-studio-project";
export const PORTABLE_PROJECT_VERSION = 1;
export const PORTABLE_PROJECT_EXTENSION = "novel";

export interface PortableProjectArchive {
  format: typeof PORTABLE_PROJECT_FORMAT;
  formatVersion: typeof PORTABLE_PROJECT_VERSION;
  appVersion: string;
  exportedAt: string;
  project: StoryProject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isProjectNode(value: unknown): value is ProjectNode {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    (value.parentId === null || isString(value.parentId)) &&
    ["folder", "scene", "document"].includes(String(value.kind)) &&
    isString(value.title) &&
    isString(value.synopsis) &&
    ["構思", "草稿", "修訂", "完成"].includes(String(value.status)) &&
    typeof value.sortOrder === "number" &&
    typeof value.wordCount === "number" &&
    isString(value.updatedAt)
  );
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
  return isRecord(value) && value.type === "doc";
}

function isStoryDocument(value: unknown): value is StoryDocument {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isRichTextDocument(value.content) &&
    isString(value.plainText) &&
    typeof value.revision === "number" &&
    isString(value.updatedAt)
  );
}

function isStoryEntity(value: unknown): value is StoryEntity {
  return (
    isRecord(value) &&
    isString(value.id) &&
    ["character", "location", "faction", "item", "lore", "term"].includes(
      String(value.type),
    ) &&
    isString(value.name) &&
    isString(value.summary) &&
    isString(value.color)
  );
}

function isTimelineEvent(value: unknown): value is TimelineEvent {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.summary) &&
    ["scene-event", "backstory", "historical", "world-event"].includes(
      String(value.kind),
    ) &&
    ["planned", "confirmed", "uncertain"].includes(String(value.status)) &&
    isString(value.storyTimeLabel) &&
    typeof value.storyOrder === "number" &&
    typeof value.narrativeOrder === "number" &&
    typeof value.importance === "number" &&
    hasStringArray(value.linkedNodeIds) &&
    hasStringArray(value.linkedEntityIds) &&
    isString(value.color) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isResearchItem(value: unknown): value is ResearchItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    ["note", "web", "pdf", "image", "document"].includes(String(value.kind)) &&
    ["inbox", "reviewed", "cited", "archived"].includes(String(value.status)) &&
    isString(value.summary) &&
    isString(value.notes) &&
    isString(value.sourceUrl) &&
    isRecord(value.citation) &&
    isString(value.citation.author) &&
    isString(value.citation.publisher) &&
    isString(value.citation.publishedAt) &&
    isString(value.citation.accessedAt) &&
    isString(value.originalFileName) &&
    isString(value.mediaType) &&
    typeof value.byteSize === "number" &&
    isString(value.dataUrl) &&
    hasStringArray(value.linkedNodeIds) &&
    hasStringArray(value.linkedEntityIds) &&
    hasStringArray(value.linkedInspirationIds) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isAiFinding(value: unknown): value is AiFinding {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.fingerprint) &&
    ["summary", "fact", "consistency", "missing-link", "missing-metadata"].includes(String(value.kind)) &&
    ["pending", "accepted", "dismissed"].includes(String(value.status)) &&
    ["info", "warning", "error"].includes(String(value.severity)) &&
    ["project", "scene", "entity", "timeline"].includes(String(value.targetType)) &&
    isString(value.targetId) &&
    isString(value.title) &&
    isString(value.explanation) &&
    isString(value.suggestion) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(
      (item) =>
        isRecord(item) && isString(item.sceneId) && isString(item.quote),
    ) &&
    isRecord(value.action) &&
    ["none", "set-scene-synopsis", "set-entity-attribute", "add-scene-entity-link"].includes(String(value.action.type)) &&
    isString(value.action.key) &&
    isString(value.action.value) &&
    isString(value.action.entityId) &&
    isString(value.action.sceneId) &&
    isString(value.detectedAt) &&
    isString(value.reviewedAt)
  );
}

function hasStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function validateStoryProject(value: unknown): StoryProject {
  if (
    !isRecord(value) ||
    ![1, 2, 3, 4, 5, 6, 7, 8].includes(Number(value.schemaVersion)) ||
    !isString(value.id) ||
    !isString(value.title) ||
    !isString(value.subtitle) ||
    !isString(value.author) ||
    !Array.isArray(value.nodes) ||
    !value.nodes.every(isProjectNode) ||
    !isRecord(value.documents) ||
    !Object.values(value.documents).every(isStoryDocument) ||
    !Array.isArray(value.entities) ||
    !value.entities.every(isStoryEntity) ||
    !isString(value.updatedAt)
  ) {
    throw new Error("這不是有效的 Novel Studio 專案，或檔案版本不受支援。");
  }

  const project = migrateStoryProject(value);
  const knowledgeShapeIsValid =
    project.entities.every(
      (entity) =>
        hasStringArray(entity.aliases) &&
        isRecord(entity.attributes) &&
        isString(entity.createdAt) &&
        isString(entity.updatedAt),
    ) &&
    project.tags.every(
      (tag) =>
        isString(tag.id) &&
        isString(tag.name) &&
        ["story", "theme", "workflow", "custom"].includes(tag.category) &&
        isString(tag.color) &&
        isString(tag.createdAt),
    ) &&
    project.inspirations.every(
      (item) =>
        isString(item.id) &&
        isString(item.title) &&
        isString(item.content) &&
        ["plot", "scene", "dialogue", "character", "world", "note"].includes(
          item.kind,
        ) &&
        ["inbox", "developing", "used", "archived"].includes(item.status) &&
        hasStringArray(item.linkedNodeIds) &&
        hasStringArray(item.linkedEntityIds) &&
        isString(item.createdAt) &&
        isString(item.updatedAt),
    );
  if (!knowledgeShapeIsValid) {
    throw new Error("專案的世界觀、標籤或靈感資料格式不完整。");
  }

  if (!project.timelineEvents.every(isTimelineEvent)) {
    throw new Error("專案的時間線資料格式不完整。");
  }
  if (!project.researchItems.every(isResearchItem)) {
    throw new Error("專案的研究素材格式不完整。");
  }
  if (!project.aiFindings.every(isAiFinding)) {
    throw new Error("專案的 AI 審核資料格式不完整。");
  }

  const ids = new Set<string>();
  for (const node of project.nodes) {
    if (ids.has(node.id)) {
      throw new Error(`專案內含重複項目：${node.title}`);
    }
    ids.add(node.id);
    if (
      node.kind === "scene" &&
      (!node.documentId || !project.documents[node.documentId])
    ) {
      throw new Error(`場景「${node.title}」缺少正文內容。`);
    }
  }

  const entityIds = new Set(project.entities.map((entity) => entity.id));
  const tagIds = new Set(project.tags.map((tag) => tag.id));
  const inspirationIds = new Set(project.inspirations.map((item) => item.id));
  const hasValidTagTarget = (targetType: string, targetId: string) => {
    if (targetType === "scene") return ids.has(targetId);
    if (targetType === "entity") return entityIds.has(targetId);
    if (targetType === "inspiration") return inspirationIds.has(targetId);
    if (targetType === "research") {
      return project.researchItems.some((item) => item.id === targetId);
    }
    return false;
  };
  if (
    project.entityRelations.some(
      (relation) =>
        !entityIds.has(relation.fromEntityId) ||
        !entityIds.has(relation.toEntityId),
    ) ||
    project.sceneEntityLinks.some(
      (link) => !ids.has(link.sceneId) || !entityIds.has(link.entityId),
    ) ||
    project.tagLinks.some(
      (link) =>
        !tagIds.has(link.tagId) ||
        !hasValidTagTarget(link.targetType, link.targetId),
    ) ||
    project.inspirations.some(
      (item) =>
        item.linkedNodeIds.some((id) => !ids.has(id)) ||
        item.linkedEntityIds.some((id) => !entityIds.has(id)),
    ) ||
    project.timelineEvents.some(
      (event) =>
        event.linkedNodeIds.some((id) => !ids.has(id)) ||
        event.linkedEntityIds.some((id) => !entityIds.has(id)),
    ) ||
    project.researchItems.some(
      (item) =>
        item.linkedNodeIds.some((id) => !ids.has(id)) ||
        item.linkedEntityIds.some((id) => !entityIds.has(id)) ||
        item.linkedInspirationIds.some((id) => !inspirationIds.has(id)),
    )
  ) {
    throw new Error("專案內含失效的人物、地點或標籤連結。");
  }

  return project;
}

export function createPortableArchive(
  project: StoryProject,
): PortableProjectArchive {
  return {
    format: PORTABLE_PROJECT_FORMAT,
    formatVersion: PORTABLE_PROJECT_VERSION,
    appVersion: version,
    exportedAt: new Date().toISOString(),
    project: structuredClone(project),
  };
}

export function serializePortableProject(project: StoryProject): string {
  return JSON.stringify(createPortableArchive(project), null, 2);
}

export function parsePortableProject(contents: string): StoryProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("無法讀取這個檔案：內容不是有效的 JSON。");
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== PORTABLE_PROJECT_FORMAT ||
    parsed.formatVersion !== PORTABLE_PROJECT_VERSION
  ) {
    throw new Error("這不是 Novel Studio 專案檔，或檔案版本不受支援。");
  }

  return validateStoryProject(parsed.project);
}

export function portableProjectFileName(title: string): string {
  const safeTitle =
    title
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[.\s]+$/g, "")
      .slice(0, 80) || "未命名小說";
  return `${safeTitle}.${PORTABLE_PROJECT_EXTENSION}`;
}
