export type NodeKind = "folder" | "scene" | "document";
export type DraftStatus = "構思" | "草稿" | "修訂" | "完成";
export type EntityType =
  | "character"
  | "location"
  | "faction"
  | "item"
  | "lore"
  | "term";
export type EntityLinkRole =
  | "pov"
  | "location"
  | "participant"
  | "mentioned"
  | "subject";
export type TagTargetType = "scene" | "entity" | "inspiration" | "research";
export type InspirationKind =
  | "plot"
  | "scene"
  | "dialogue"
  | "character"
  | "world"
  | "note";
export type InspirationStatus = "inbox" | "developing" | "used" | "archived";
export type TimelineEventKind =
  | "scene-event"
  | "backstory"
  | "historical"
  | "world-event";
export type TimelineEventStatus = "planned" | "confirmed" | "uncertain";
export type ResearchKind = "note" | "web" | "pdf" | "image" | "document";
export type ResearchStatus = "inbox" | "reviewed" | "cited" | "archived";
export type AiFindingKind =
  | "summary"
  | "fact"
  | "consistency"
  | "missing-link"
  | "missing-metadata";
export type AiFindingStatus = "pending" | "accepted" | "dismissed";
export type AiFindingSeverity = "info" | "warning" | "error";
export type AiFindingTargetType = "project" | "scene" | "entity" | "timeline";
export type AiFindingActionType =
  | "none"
  | "set-scene-synopsis"
  | "set-entity-attribute"
  | "add-scene-entity-link";

export interface RichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
}

export interface RichTextDocument extends RichTextNode {
  type: "doc";
}

export interface ProjectNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  title: string;
  synopsis: string;
  status: DraftStatus;
  pov?: string;
  location?: string;
  sortOrder: number;
  wordCount: number;
  targetWords?: number;
  documentId?: string;
  updatedAt: string;
}

export interface StoryDocument {
  id: string;
  content: RichTextDocument;
  plainText: string;
  revision: number;
  updatedAt: string;
}

export interface StoryEntity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];
  summary: string;
  color: string;
  attributes: Record<string, string>;
  characterSheet?: import("./characterSheet").CharacterSheet;
  createdAt: string;
  updatedAt: string;
}

export interface EntityRelation {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  label: string;
  notes: string;
  sourceNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryTag {
  id: string;
  name: string;
  category: "story" | "theme" | "workflow" | "custom";
  color: string;
  createdAt: string;
}

export interface TagLink {
  id: string;
  tagId: string;
  targetType: TagTargetType;
  targetId: string;
  createdAt: string;
}

export interface SceneEntityLink {
  id: string;
  sceneId: string;
  entityId: string;
  role: EntityLinkRole;
  source: "manual" | "migration" | "ai-candidate";
  createdAt: string;
}

export interface InspirationItem {
  id: string;
  title: string;
  content: string;
  kind: InspirationKind;
  status: InspirationStatus;
  linkedNodeIds: string[];
  linkedEntityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  summary: string;
  kind: TimelineEventKind;
  status: TimelineEventStatus;
  storyTimeLabel: string;
  storyOrder: number;
  narrativeOrder: number;
  importance: 1 | 2 | 3 | 4 | 5;
  linkedNodeIds: string[];
  linkedEntityIds: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchCitation {
  author: string;
  publisher: string;
  publishedAt: string;
  accessedAt: string;
}

export interface ResearchItem {
  id: string;
  title: string;
  kind: ResearchKind;
  status: ResearchStatus;
  summary: string;
  notes: string;
  sourceUrl: string;
  citation: ResearchCitation;
  originalFileName: string;
  mediaType: string;
  byteSize: number;
  dataUrl: string;
  linkedNodeIds: string[];
  linkedEntityIds: string[];
  linkedInspirationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AiFindingEvidence {
  sceneId: string;
  quote: string;
}

export interface AiFindingAction {
  type: AiFindingActionType;
  key: string;
  value: string;
  entityId: string;
  sceneId: string;
}

export interface AiFinding {
  id: string;
  fingerprint: string;
  kind: AiFindingKind;
  status: AiFindingStatus;
  severity: AiFindingSeverity;
  targetType: AiFindingTargetType;
  targetId: string;
  title: string;
  explanation: string;
  suggestion: string;
  evidence: AiFindingEvidence[];
  action: AiFindingAction;
  detectedAt: string;
  reviewedAt: string;
}

export interface StoryProject {
  schemaVersion: 6 | 7 | 8 | 9 | 10;
  writingVariables?: import("./writingVariables").WritingVariable[];
  interactiveBook?: import("./interactiveBook").InteractiveBook;
  fictionalHistory?: import("./fictionalHistory").FictionalHistory;
  id: string;
  title: string;
  subtitle: string;
  author: string;
  nodes: ProjectNode[];
  documents: Record<string, StoryDocument>;
  entities: StoryEntity[];
  entityRelations: EntityRelation[];
  tags: StoryTag[];
  tagLinks: TagLink[];
  sceneEntityLinks: SceneEntityLink[];
  inspirations: InspirationItem[];
  timelineEvents: TimelineEvent[];
  researchItems: ResearchItem[];
  aiFindings: AiFinding[];
  updatedAt: string;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  label: string;
  project: StoryProject;
  createdAt: string;
}

export interface ProjectRepository {
  readonly kind: "browser" | "sqlite";
  readonly label: string;
  load(): Promise<StoryProject | null>;
  listProjects(): Promise<Array<{ id: string; title: string }>>;
  loadProject(id: string): Promise<StoryProject | null>;
  save(project: StoryProject): Promise<void>;
  createSnapshot(project: StoryProject, label: string): Promise<void>;
  listSnapshots(projectId: string): Promise<ProjectSnapshot[]>;
  clear(): Promise<void>;
}
