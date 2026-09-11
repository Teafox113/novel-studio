import type { StoryProject, TagTargetType } from "../domain/models";

export type SearchResultKind =
  | "scene"
  | "document"
  | "entity"
  | "timeline"
  | "research"
  | "inspiration";

export interface ProjectSearchResult {
  key: string;
  kind: SearchResultKind;
  targetId: string;
  title: string;
  subtitle: string;
  excerpt: string;
  matchedFields: string[];
  score: number;
  updatedAt: string;
}

export interface ParsedSearchQuery {
  terms: string[];
  type: SearchResultKind | null;
}

interface SearchField {
  label: string;
  value: string;
  weight: number;
  excerpt?: boolean;
}

interface SearchDocument {
  key: string;
  kind: SearchResultKind;
  targetId: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  fields: SearchField[];
}

const typeAliases: Record<string, SearchResultKind> = {
  scene: "scene",
  scenes: "scene",
  場景: "scene",
  正文: "scene",
  document: "document",
  folder: "document",
  文件: "document",
  資料夾: "document",
  entity: "entity",
  world: "entity",
  人物: "entity",
  世界觀: "entity",
  實體: "entity",
  timeline: "timeline",
  event: "timeline",
  時間線: "timeline",
  事件: "timeline",
  research: "research",
  研究: "research",
  素材: "research",
  inspiration: "inspiration",
  idea: "inspiration",
  靈感: "inspiration",
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("zh-TW").trim();
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const terms: string[] = [];
  let type: SearchResultKind | null = null;
  const tokenPattern = /"([^"]+)"|(\S+)/g;
  for (const match of query.matchAll(tokenPattern)) {
    const raw = (match[1] ?? match[2] ?? "").trim();
    const typeMatch = raw.match(/^(?:type|類型)[:：](.+)$/i);
    if (typeMatch) {
      type = typeAliases[normalize(typeMatch[1])] ?? type;
      continue;
    }
    const term = normalize(raw.replace(/^#/, ""));
    if (term && !terms.includes(term)) terms.push(term);
  }
  return { terms, type };
}

function tagsFor(
  project: StoryProject,
  targetType: TagTargetType,
  targetId: string,
): string[] {
  const tagIds = new Set(
    project.tagLinks
      .filter(
        (link) => link.targetType === targetType && link.targetId === targetId,
      )
      .map((link) => link.tagId),
  );
  return project.tags.filter((tag) => tagIds.has(tag.id)).map((tag) => tag.name);
}

function entityNames(project: StoryProject, ids: string[]): string[] {
  const idSet = new Set(ids);
  return project.entities
    .filter((entity) => idSet.has(entity.id))
    .flatMap((entity) => [entity.name, ...entity.aliases]);
}

export function buildProjectSearchIndex(project: StoryProject): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const node of project.nodes) {
    const storyDocument = node.documentId
      ? project.documents[node.documentId]
      : undefined;
    const sceneLinks = project.sceneEntityLinks.filter(
      (link) => link.sceneId === node.id,
    );
    const linkedNames = entityNames(
      project,
      sceneLinks.map((link) => link.entityId),
    );
    const tags = tagsFor(project, "scene", node.id);
    documents.push({
      key: `node:${node.id}`,
      kind: node.kind === "scene" ? "scene" : "document",
      targetId: node.id,
      title: node.title,
      subtitle:
        node.kind === "scene"
          ? `${node.status} · ${node.wordCount.toLocaleString()} 字`
          : node.kind === "folder"
            ? "手稿資料夾"
            : "手稿文件",
      updatedAt: node.updatedAt,
      fields: [
        { label: "標題", value: node.title, weight: 130 },
        { label: "摘要", value: node.synopsis, weight: 75, excerpt: true },
        {
          label: "正文",
          value: storyDocument?.plainText ?? "",
          weight: 45,
          excerpt: true,
        },
        { label: "Tag", value: tags.join(" "), weight: 85 },
        { label: "關聯人物／地點", value: linkedNames.join(" "), weight: 60 },
        { label: "狀態", value: node.status, weight: 30 },
      ],
    });
  }

  for (const entity of project.entities) {
    const tags = tagsFor(project, "entity", entity.id);
    const relationText = project.entityRelations
      .filter(
        (relation) =>
          relation.fromEntityId === entity.id || relation.toEntityId === entity.id,
      )
      .flatMap((relation) => {
        const otherId =
          relation.fromEntityId === entity.id
            ? relation.toEntityId
            : relation.fromEntityId;
        const other = project.entities.find((item) => item.id === otherId);
        return [relation.label, relation.type, relation.notes, other?.name ?? ""];
      });
    documents.push({
      key: `entity:${entity.id}`,
      kind: "entity",
      targetId: entity.id,
      title: entity.name,
      subtitle: `${entityTypeLabel[entity.type]} · ${entity.aliases.length} 個別名`,
      updatedAt: entity.updatedAt,
      fields: [
        { label: "名稱", value: entity.name, weight: 140 },
        { label: "別名", value: entity.aliases.join(" "), weight: 115 },
        { label: "摘要", value: entity.summary, weight: 75, excerpt: true },
        {
          label: "屬性",
          value: Object.entries(entity.attributes)
            .flatMap(([key, value]) => [key, value])
            .join(" "),
          weight: 70,
          excerpt: true,
        },
        { label: "關係", value: relationText.join(" "), weight: 55 },
        { label: "Tag", value: tags.join(" "), weight: 85 },
      ],
    });
  }

  for (const event of project.timelineEvents) {
    documents.push({
      key: `timeline:${event.id}`,
      kind: "timeline",
      targetId: event.id,
      title: event.title,
      subtitle: `${event.storyTimeLabel} · 重要度 ${event.importance}`,
      updatedAt: event.updatedAt,
      fields: [
        { label: "標題", value: event.title, weight: 130 },
        { label: "摘要", value: event.summary, weight: 75, excerpt: true },
        { label: "故事時間", value: event.storyTimeLabel, weight: 95 },
        {
          label: "關聯人物／地點",
          value: entityNames(project, event.linkedEntityIds).join(" "),
          weight: 60,
        },
        {
          label: "關聯場景",
          value: project.nodes
            .filter((node) => event.linkedNodeIds.includes(node.id))
            .map((node) => node.title)
            .join(" "),
          weight: 55,
        },
      ],
    });
  }

  for (const item of project.researchItems) {
    const tags = tagsFor(project, "research", item.id);
    documents.push({
      key: `research:${item.id}`,
      kind: "research",
      targetId: item.id,
      title: item.title,
      subtitle: `${researchKindLabel[item.kind]} · ${researchStatusLabel[item.status]}`,
      updatedAt: item.updatedAt,
      fields: [
        { label: "標題", value: item.title, weight: 130 },
        { label: "摘要", value: item.summary, weight: 75, excerpt: true },
        { label: "筆記", value: item.notes, weight: 55, excerpt: true },
        { label: "網址", value: item.sourceUrl, weight: 45 },
        { label: "檔名", value: item.originalFileName, weight: 70 },
        {
          label: "引用資訊",
          value: Object.values(item.citation).join(" "),
          weight: 50,
        },
        { label: "Tag", value: tags.join(" "), weight: 85 },
        {
          label: "關聯人物／地點",
          value: entityNames(project, item.linkedEntityIds).join(" "),
          weight: 60,
        },
        {
          label: "關聯靈感",
          value: project.inspirations
            .filter((inspiration) =>
              item.linkedInspirationIds.includes(inspiration.id),
            )
            .map((inspiration) => inspiration.title)
            .join(" "),
          weight: 60,
        },
      ],
    });
  }

  for (const item of project.inspirations) {
    const tags = tagsFor(project, "inspiration", item.id);
    documents.push({
      key: `inspiration:${item.id}`,
      kind: "inspiration",
      targetId: item.id,
      title: item.title,
      subtitle: `${inspirationKindLabel[item.kind]} · ${inspirationStatusLabel[item.status]}`,
      updatedAt: item.updatedAt,
      fields: [
        { label: "標題", value: item.title, weight: 130 },
        { label: "內容", value: item.content, weight: 65, excerpt: true },
        { label: "Tag", value: tags.join(" "), weight: 85 },
        {
          label: "關聯人物／地點",
          value: entityNames(project, item.linkedEntityIds).join(" "),
          weight: 60,
        },
      ],
    });
  }

  return documents;
}

function buildExcerpt(fields: SearchField[], terms: string[]): string {
  const preferred = fields.filter((field) => field.excerpt && field.value.trim());
  const candidates = preferred.length > 0 ? preferred : fields;
  let field = candidates.find((candidate) => {
    const normalized = normalize(candidate.value);
    return terms.some((term) => normalized.includes(term));
  });
  field ??= candidates.find((candidate) => candidate.value.trim());
  if (!field) return "";

  const compact = field.value.replace(/\s+/g, " ").trim();
  const normalized = normalize(compact);
  const positions = terms
    .map((term) => normalized.indexOf(term))
    .filter((position) => position >= 0);
  const position = positions.length > 0 ? Math.min(...positions) : 0;
  const start = Math.max(0, position - 42);
  const end = Math.min(compact.length, start + 132);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

export function searchProjectIndex(
  index: SearchDocument[],
  query: string,
  kindFilter: SearchResultKind | "all" = "all",
  limit = 80,
): ProjectSearchResult[] {
  const parsed = parseSearchQuery(query);
  const effectiveKind = kindFilter === "all" ? parsed.type : kindFilter;
  if (parsed.terms.length === 0) return [];

  return index
    .filter((document) => !effectiveKind || document.kind === effectiveKind)
    .map((document) => {
      const normalizedTitle = normalize(document.title);
      const matchedFields = new Set<string>();
      let score = 0;
      let matchedAll = true;

      for (const term of parsed.terms) {
        let termMatched = false;
        for (const field of document.fields) {
          const value = normalize(field.value);
          if (!value.includes(term)) continue;
          termMatched = true;
          matchedFields.add(field.label);
          const occurrences = Math.min(4, value.split(term).length - 1);
          score += field.weight + Math.max(0, occurrences - 1) * 6;
          if (value === term) score += 90;
          else if (value.startsWith(term)) score += 35;
        }
        if (!termMatched) matchedAll = false;
      }

      if (normalizedTitle === parsed.terms.join(" ")) score += 160;
      return {
        key: document.key,
        kind: document.kind,
        targetId: document.targetId,
        title: document.title,
        subtitle: document.subtitle,
        excerpt: buildExcerpt(document.fields, parsed.terms),
        matchedFields: [...matchedFields],
        score,
        updatedAt: document.updatedAt,
        matchedAll,
      };
    })
    .filter((result) => result.matchedAll)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.title.localeCompare(b.title, "zh-TW"),
    )
    .slice(0, limit)
    .map(({ matchedAll: _matchedAll, ...result }) => result);
}

export function searchProject(
  project: StoryProject,
  query: string,
  kindFilter: SearchResultKind | "all" = "all",
  limit = 80,
): ProjectSearchResult[] {
  return searchProjectIndex(
    buildProjectSearchIndex(project),
    query,
    kindFilter,
    limit,
  );
}

const entityTypeLabel = {
  character: "人物",
  location: "地點",
  faction: "勢力",
  item: "物品",
  lore: "設定",
  term: "專有名詞",
} as const;

const researchKindLabel = {
  note: "筆記",
  web: "網站",
  pdf: "PDF",
  image: "圖片",
  document: "文件",
} as const;

const researchStatusLabel = {
  inbox: "待整理",
  reviewed: "已檢視",
  cited: "已引用",
  archived: "已封存",
} as const;

const inspirationKindLabel = {
  plot: "劇情構思",
  scene: "場景草稿",
  dialogue: "對白",
  character: "人物靈感",
  world: "世界觀靈感",
  note: "隨手筆記",
} as const;

const inspirationStatusLabel = {
  inbox: "收件匣",
  developing: "發展中",
  used: "已採用",
  archived: "已封存",
} as const;
