import { validateCharacterSheet } from "./characterSheet";
import { defaultHistory, validateHistory } from "./fictionalHistory";
import type {
  AiFinding,
  AiFindingActionType,
  AiFindingKind,
  AiFindingSeverity,
  AiFindingStatus,
  AiFindingTargetType,
  EntityRelation,
  EntityType,
  InspirationItem,
  ProjectNode,
  ResearchItem,
  ResearchKind,
  ResearchStatus,
  SceneEntityLink,
  StoryEntity,
  StoryProject,
  StoryTag,
  TagLink,
  TimelineEvent,
  TimelineEventKind,
  TimelineEventStatus,
} from "./models";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableLegacyId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function entityType(value: unknown): EntityType {
  return ["character", "location", "faction", "item", "lore", "term"].includes(
    String(value),
  )
    ? (value as EntityType)
    : "lore";
}

function timelineKind(value: unknown): TimelineEventKind {
  return ["scene-event", "backstory", "historical", "world-event"].includes(
    String(value),
  )
    ? (value as TimelineEventKind)
    : "world-event";
}

function timelineStatus(value: unknown): TimelineEventStatus {
  return ["planned", "confirmed", "uncertain"].includes(String(value))
    ? (value as TimelineEventStatus)
    : "planned";
}

function researchKind(value: unknown): ResearchKind {
  return ["note", "web", "pdf", "image", "document"].includes(String(value))
    ? (value as ResearchKind)
    : "note";
}

function researchStatus(value: unknown): ResearchStatus {
  return ["inbox", "reviewed", "cited", "archived"].includes(String(value))
    ? (value as ResearchStatus)
    : "inbox";
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
): T {
  return values.includes(String(value) as T) ? (value as T) : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scenesInManuscriptOrder(nodes: ProjectNode[]): ProjectNode[] {
  const ordered: ProjectNode[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null) => {
    nodes
      .filter((node) => node.parentId === parentId)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .forEach((node) => {
        visited.add(node.id);
        if (node.kind === "scene") ordered.push(node);
        else visit(node.id);
      });
  };
  visit(null);
  nodes
    .filter((node) => node.kind === "scene" && !visited.has(node.id))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .forEach((node) => ordered.push(node));
  return ordered;
}

export function migrateStoryProject(value: unknown): StoryProject {
  if (!isRecord(value)) {
    throw new Error("專案資料格式無法辨識。");
  }

  if (Number(value.schemaVersion) > 8) throw new Error("此專案來自較新版本，請升級程式後再開啟。");
  const now = new Date().toISOString();
  const rawNodes = Array.isArray(value.nodes) ? value.nodes : [];
  const nodes = rawNodes.map((node) => ({ ...(node as ProjectNode) }));
  const rawEntities = Array.isArray(value.entities) ? value.entities : [];
  const entities: StoryEntity[] = rawEntities.map((entry) => {
    const raw = entry as Partial<StoryEntity>;
    return {
      id: String(raw.id ?? crypto.randomUUID()),
      type: entityType(raw.type),
      name: String(raw.name ?? "未命名項目"),
      characterSheet: raw.characterSheet === undefined ? undefined : validateCharacterSheet(raw.characterSheet),
      aliases: Array.isArray(raw.aliases) ? raw.aliases.map(String) : [],
      summary: String(raw.summary ?? ""),
      color: String(raw.color ?? "#8c96a8"),
      attributes: isRecord(raw.attributes)
        ? Object.fromEntries(
            Object.entries(raw.attributes).map(([key, item]) => [key, String(item)]),
          )
        : {},
      createdAt: String(raw.createdAt ?? raw.updatedAt ?? value.updatedAt ?? now),
      updatedAt: String(raw.updatedAt ?? value.updatedAt ?? now),
    };
  });

  const ensureEntity = (type: EntityType, name: string): StoryEntity => {
    const normalized = name.trim();
    const existing = entities.find(
      (entity) => entity.type === type && entity.name === normalized,
    );
    if (existing) return existing;
    const created: StoryEntity = {
      id: stableLegacyId(`entity-${type}`, normalized),
      type,
      name: normalized,
      aliases: [],
      summary: "由舊版場景資料自動建立，等待補充設定。",
      color: type === "character" ? "#d98a63" : "#579b8d",
      attributes: {},
      createdAt: now,
      updatedAt: now,
    };
    entities.push(created);
    return created;
  };

  const existingSceneLinks = Array.isArray(value.sceneEntityLinks)
    ? (value.sceneEntityLinks as SceneEntityLink[]).map((link) => ({ ...link }))
    : [];
  const sceneEntityLinks = [...existingSceneLinks];

  for (const node of nodes) {
    if (node.kind !== "scene") continue;
    const legacyPov = typeof node.pov === "string" ? node.pov.trim() : "";
    const legacyLocation =
      typeof node.location === "string" ? node.location.trim() : "";
    if (
      legacyPov &&
      !sceneEntityLinks.some(
        (link) => link.sceneId === node.id && link.role === "pov",
      )
    ) {
      const character = ensureEntity("character", legacyPov);
      sceneEntityLinks.push({
        id: stableLegacyId("scene-link", `${node.id}:pov:${character.id}`),
        sceneId: node.id,
        entityId: character.id,
        role: "pov",
        source: "migration",
        createdAt: now,
      });
    }
    if (
      legacyLocation &&
      !sceneEntityLinks.some(
        (link) => link.sceneId === node.id && link.role === "location",
      )
    ) {
      const location = ensureEntity("location", legacyLocation);
      sceneEntityLinks.push({
        id: stableLegacyId("scene-link", `${node.id}:location:${location.id}`),
        sceneId: node.id,
        entityId: location.id,
        role: "location",
        source: "migration",
        createdAt: now,
      });
    }
  }

  const rawTimelineEvents = Array.isArray(value.timelineEvents)
    ? value.timelineEvents
    : null;
  const timelineEvents: TimelineEvent[] = rawTimelineEvents
    ? rawTimelineEvents.map((entry, index) => {
        const raw = entry as Partial<TimelineEvent>;
        const importance = Math.min(
          5,
          Math.max(1, Math.round(finiteNumber(raw.importance, 3))),
        ) as TimelineEvent["importance"];
        return {
          id: String(raw.id ?? crypto.randomUUID()),
          title: String(raw.title ?? "未命名事件"),
          summary: String(raw.summary ?? ""),
          kind: timelineKind(raw.kind),
          status: timelineStatus(raw.status),
          storyTimeLabel: String(raw.storyTimeLabel ?? "未設定故事時間"),
          storyOrder: finiteNumber(raw.storyOrder, index + 1),
          narrativeOrder: finiteNumber(raw.narrativeOrder, index + 1),
          importance,
          linkedNodeIds: Array.isArray(raw.linkedNodeIds)
            ? raw.linkedNodeIds.map(String)
            : [],
          linkedEntityIds: Array.isArray(raw.linkedEntityIds)
            ? raw.linkedEntityIds.map(String)
            : [],
          color: String(raw.color ?? "#7b87b8"),
          createdAt: String(raw.createdAt ?? value.updatedAt ?? now),
          updatedAt: String(raw.updatedAt ?? value.updatedAt ?? now),
        };
      })
    : scenesInManuscriptOrder(nodes)
        .map((node, index) => ({
          id: stableLegacyId("timeline-event", node.id),
          title: node.title,
          summary: node.synopsis,
          kind: "scene-event" as const,
          status: "planned" as const,
          storyTimeLabel: "未設定故事時間",
          storyOrder: index + 1,
          narrativeOrder: index + 1,
          importance: 3 as const,
          linkedNodeIds: [node.id],
          linkedEntityIds: sceneEntityLinks
            .filter((link) => link.sceneId === node.id)
            .map((link) => link.entityId),
          color: "#7b87b8",
          createdAt: String(node.updatedAt ?? value.updatedAt ?? now),
          updatedAt: String(node.updatedAt ?? value.updatedAt ?? now),
        }));

  const researchItems: ResearchItem[] = Array.isArray(value.researchItems)
    ? value.researchItems.map((entry) => {
        const raw = entry as Partial<ResearchItem>;
        const citation: Record<string, unknown> = isRecord(raw.citation)
          ? raw.citation
          : {};
        return {
          id: String(raw.id ?? crypto.randomUUID()),
          title: String(raw.title ?? "未命名研究素材"),
          kind: researchKind(raw.kind),
          status: researchStatus(raw.status),
          summary: String(raw.summary ?? ""),
          notes: String(raw.notes ?? ""),
          sourceUrl: String(raw.sourceUrl ?? ""),
          citation: {
            author: String(citation.author ?? ""),
            publisher: String(citation.publisher ?? ""),
            publishedAt: String(citation.publishedAt ?? ""),
            accessedAt: String(citation.accessedAt ?? ""),
          },
          originalFileName: String(raw.originalFileName ?? ""),
          mediaType: String(raw.mediaType ?? ""),
          byteSize: Math.max(0, finiteNumber(raw.byteSize, 0)),
          dataUrl: String(raw.dataUrl ?? ""),
          linkedNodeIds: Array.isArray(raw.linkedNodeIds)
            ? raw.linkedNodeIds.map(String)
            : [],
          linkedEntityIds: Array.isArray(raw.linkedEntityIds)
            ? raw.linkedEntityIds.map(String)
            : [],
          linkedInspirationIds: Array.isArray(raw.linkedInspirationIds)
            ? raw.linkedInspirationIds.map(String)
            : [],
          createdAt: String(raw.createdAt ?? value.updatedAt ?? now),
          updatedAt: String(raw.updatedAt ?? value.updatedAt ?? now),
        };
      })
    : [];
  const aiFindings: AiFinding[] = Array.isArray(value.aiFindings)
    ? value.aiFindings.map((entry) => {
        const raw = entry as Partial<AiFinding>;
        const rawAction: Record<string, unknown> = isRecord(raw.action)
          ? raw.action
          : {};
        return {
          id: String(raw.id ?? crypto.randomUUID()),
          fingerprint: String(raw.fingerprint ?? raw.id ?? crypto.randomUUID()),
          kind: oneOf<AiFindingKind>(
            raw.kind,
            ["summary", "fact", "consistency", "missing-link", "missing-metadata"],
            "consistency",
          ),
          status: oneOf<AiFindingStatus>(
            raw.status,
            ["pending", "accepted", "dismissed"],
            "pending",
          ),
          severity: oneOf<AiFindingSeverity>(
            raw.severity,
            ["info", "warning", "error"],
            "info",
          ),
          targetType: oneOf<AiFindingTargetType>(
            raw.targetType,
            ["project", "scene", "entity", "timeline"],
            "project",
          ),
          targetId: String(raw.targetId ?? ""),
          title: String(raw.title ?? "未命名分析結果"),
          explanation: String(raw.explanation ?? ""),
          suggestion: String(raw.suggestion ?? ""),
          evidence: Array.isArray(raw.evidence)
            ? raw.evidence.map((item) => {
                const evidence: Record<string, unknown> = isRecord(item)
                  ? item
                  : {};
                return {
                  sceneId: String(evidence.sceneId ?? ""),
                  quote: String(evidence.quote ?? ""),
                };
              })
            : [],
          action: {
            type: oneOf<AiFindingActionType>(
              rawAction.type,
              [
                "none",
                "set-scene-synopsis",
                "set-entity-attribute",
                "add-scene-entity-link",
              ],
              "none",
            ),
            key: String(rawAction.key ?? ""),
            value: String(rawAction.value ?? ""),
            entityId: String(rawAction.entityId ?? ""),
            sceneId: String(rawAction.sceneId ?? ""),
          },
          detectedAt: String(raw.detectedAt ?? value.updatedAt ?? now),
          reviewedAt: String(raw.reviewedAt ?? ""),
        };
      })
    : [];

  return {
    schemaVersion: 8,
    fictionalHistory: value.fictionalHistory === undefined ? defaultHistory() : validateHistory(value.fictionalHistory),
    id: String(value.id ?? crypto.randomUUID()),
    title: String(value.title ?? "未命名小說"),
    subtitle: String(value.subtitle ?? ""),
    author: String(value.author ?? ""),
    nodes,
    documents: isRecord(value.documents)
      ? (value.documents as StoryProject["documents"])
      : {},
    entities,
    entityRelations: Array.isArray(value.entityRelations)
      ? (value.entityRelations as EntityRelation[]).map((relation) => ({
          ...relation,
          sourceNodeIds: Array.isArray(relation.sourceNodeIds)
            ? relation.sourceNodeIds
            : [],
        }))
      : [],
    tags: Array.isArray(value.tags)
      ? (value.tags as StoryTag[]).map((tag) => ({ ...tag }))
      : [],
    tagLinks: Array.isArray(value.tagLinks)
      ? (value.tagLinks as TagLink[]).map((link) => ({ ...link }))
      : [],
    sceneEntityLinks,
    inspirations: Array.isArray(value.inspirations)
      ? (value.inspirations as InspirationItem[]).map((item) => ({
          ...item,
          linkedNodeIds: Array.isArray(item.linkedNodeIds)
            ? item.linkedNodeIds
            : [],
          linkedEntityIds: Array.isArray(item.linkedEntityIds)
            ? item.linkedEntityIds
            : [],
        }))
      : [],
    timelineEvents,
    researchItems,
    aiFindings,
    updatedAt: String(value.updatedAt ?? now),
  };
}
