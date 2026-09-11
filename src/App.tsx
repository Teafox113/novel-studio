import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestore,
  Blocks,
  AlertTriangle,
  BookOpenText,
  Bot,
  Check,
  ChevronRight,
  ClipboardPaste,
  CloudOff,
  Columns3,
  Download,
  FileArchive,
  FileOutput,
  FileSearch,
  HardDrive,
  History,
  Library,
  LayoutGrid,
  ListTree,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  Sparkles,
  Upload,
  Waypoints,
  X,
} from "lucide-react";
import { Binder } from "./components/Binder";
import { AiWorkspace } from "./components/AiWorkspace";
import { Corkboard } from "./components/Corkboard";
import { CompileCenter } from "./components/CompileCenter";
import { Inspector } from "./components/Inspector";
import { InspirationEditor } from "./components/InspirationEditor";
import { Outliner } from "./components/Outliner";
import { ProjectSearchDialog } from "./components/ProjectSearchDialog";
import { QuickCaptureDialog } from "./components/QuickCaptureDialog";
import { ResearchLibrary } from "./components/ResearchLibrary";
import { ResearchQuickPanel } from "./components/ResearchQuickPanel";
import { StoryEditor } from "./components/StoryEditor";
import { VersionInfo } from "./components/VersionInfo";
import { SnapshotComparison } from "./components/SnapshotComparison";
import { TimelineWorkspace } from "./components/TimelineWorkspace";
import { WorldBible } from "./components/WorldBible";
import { sampleProject } from "./data/sampleProject";
import type {
  AiFinding,
  EntityLinkRole,
  EntityType,
  InspirationItem,
  ProjectSnapshot,
  ProjectNode,
  RichTextDocument,
  ResearchItem,
  StoryEntity,
  StoryProject,
  TimelineEvent,
} from "./domain/models";
import { analyzeProjectLocally, mergeAiFindings } from "./ai/localAnalyzer";
import { applyAiReview } from "./ai/reviewActions";
import type { ProjectSearchResult } from "./search/projectSearch";
import {
  countWords,
  manuscriptScenes,
  moveSibling,
  projectWordCount,
} from "./domain/project";
import { moveTimelineEvent, type TimelineAxis } from "./domain/timeline";
import {
  importResearchFile,
  importResearchFileObject,
  saveResearchAttachment,
} from "./research/researchFiles";
import { classifyQuickText } from "./capture/quickCapture";
import { createProjectRepository } from "./storage/createProjectRepository";
import {
  exportPortableProject,
  importPortableProject,
} from "./portable/projectTransfer";

type WorkspaceView = "editor" | "corkboard" | "outliner";
type Section =
  | "manuscript"
  | "world"
  | "timeline"
  | "research"
  | "compile"
  | "ai";
type SaveState = "saved" | "saving" | "error";

const repository = createProjectRepository();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function timelineEventForScene(
  node: ProjectNode,
  existingEvents: TimelineEvent[],
  linkedEntityIds: string[] = [],
): TimelineEvent {
  const storyOrder =
    Math.max(0, ...existingEvents.map((event) => event.storyOrder)) + 1;
  const narrativeOrder =
    Math.max(0, ...existingEvents.map((event) => event.narrativeOrder)) + 1;
  return {
    id: crypto.randomUUID(),
    title: node.title,
    summary: node.synopsis,
    kind: "scene-event",
    status: "planned",
    storyTimeLabel: "未設定故事時間",
    storyOrder,
    narrativeOrder,
    importance: 3,
    linkedNodeIds: [node.id],
    linkedEntityIds,
    color: "#7b87b8",
    createdAt: node.updatedAt,
    updatedAt: node.updatedAt,
  };
}

const sectionItems = [
  { id: "manuscript" as const, label: "手稿", icon: BookOpenText },
  { id: "world" as const, label: "世界觀", icon: Library },
  { id: "timeline" as const, label: "時間線", icon: Waypoints },
  { id: "research" as const, label: "研究", icon: FileSearch },
  { id: "compile" as const, label: "匯出", icon: FileOutput },
  { id: "ai" as const, label: "AI 協作", icon: Sparkles },
];

const moduleCopy: Record<
  Exclude<Section, "manuscript">,
  { eyebrow: string; title: string; description: string; items: string[] }
> = {
  world: {
    eyebrow: "WORLD BIBLE",
    title: "世界觀資料庫",
    description: "將人物、地點、勢力與物品整理成可以互相連結的故事知識庫。",
    items: ["人物卡與角色弧線", "地點與勢力", "雙向關係", "本文出現位置"],
  },
  timeline: {
    eyebrow: "TIMELINE",
    title: "雙軸故事時間線",
    description: "同時檢視故事內時間與讀者閱讀順序，提早發現日期與年齡衝突。",
    items: ["故事時間", "敘事順序", "人物年齡", "事件依賴"],
  },
  research: {
    eyebrow: "RESEARCH",
    title: "研究與素材",
    description: "集中管理 PDF、圖片、網站摘錄與靈感筆記，不必離開寫作空間。",
    items: ["PDF 閱讀", "圖片素材", "來源註記", "場景引用"],
  },
  compile: {
    eyebrow: "COMPILE",
    title: "書稿匯出中心",
    description: "將 Binder 手稿依規則組裝為投稿文件、電子書與保存格式。",
    items: ["DOCX", "EPUB 3", "PDF 列印", "HTML 與純文字"],
  },
  ai: {
    eyebrow: "AI COPILOT",
    title: "可核准的 AI 協作",
    description: "AI 只提出摘要、矛盾與修改建議；所有正文變更都先顯示差異。",
    items: ["場景摘要", "一致性檢查", "人物記憶", "修改差異"],
  },
};

function App() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [selectedId, setSelectedId] = useState("scene-1");
  const [selectedInspirationId, setSelectedInspirationId] = useState<
    string | null
  >(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(
    null,
  );
  const [selectedWorldEntityId, setSelectedWorldEntityId] = useState<
    string | null
  >(null);
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<
    string | null
  >(null);
  const [aiScanning, setAiScanning] = useState(false);
  const [view, setView] = useState<WorkspaceView>("editor");
  const [section, setSection] = useState<Section>("manuscript");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    if (!focusMode) return;
    const exit = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) setFocusMode(false);
    };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [focusMode]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);
  const [transferMenuOpen, setTransferMenuOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [operationBusy, setOperationBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [researchPeekOpen, setResearchPeekOpen] = useState(false);
  const [researchPeekPinned, setResearchPeekPinned] = useState(
    () => localStorage.getItem("novel-studio:research-peek-pinned") === "true",
  );
  const [researchPeekWidth, setResearchPeekWidth] = useState(() =>
    Number(localStorage.getItem("novel-studio:research-peek-width") ?? 420),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiScale, setUiScale] = useState<100 | 110 | 125>(() => {
    const saved = Number(localStorage.getItem("novel-studio:ui-scale"));
    return saved === 110 || saved === 125 ? saved : 100;
  });
  const [editorFontSize, setEditorFontSize] = useState(() =>
    Number(localStorage.getItem("novel-studio:editor-font-size") ?? 18),
  );
  const hydrated = useRef(false);

  useEffect(() => {
    repository
      .load()
      .then((storedProject) => {
        setProject(storedProject ?? structuredClone(sampleProject));
        hydrated.current = true;
        if (storedProject) {
          void repository
            .listSnapshots(storedProject.id)
            .then(async (storedSnapshots) => {
              const latestAutomatic = storedSnapshots.find((snapshot) =>
                snapshot.label.startsWith("自動備份"),
              );
              const isDue =
                !latestAutomatic ||
                Date.now() - new Date(latestAutomatic.createdAt).getTime() >=
                  ONE_DAY_MS;
              if (isDue) {
                const date = new Intl.DateTimeFormat("zh-TW", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date());
                await repository.createSnapshot(
                  storedProject,
                  `自動備份 · ${date}`,
                );
              }
            })
            .catch(() => {
              // Automatic backup must not prevent the writing space from opening.
            });
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "無法開啟本機專案資料庫。";
        setStorageError(message);
        setSaveState("error");
        setProject(structuredClone(sampleProject));
      });
  }, []);

  useEffect(() => {
    if (!project || !hydrated.current) return;
    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        await repository.save(project);
        setStorageError(null);
        setSaveState("saved");
      } catch (error: unknown) {
        setStorageError(
          error instanceof Error ? error.message : "專案資料儲存失敗。",
        );
        setSaveState("error");
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [project]);

  useEffect(() => {
    const openProjectSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "Space") {
        event.preventDefault();
        setQuickCaptureOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        setResearchPeekOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", openProjectSearch);
    return () => window.removeEventListener("keydown", openProjectSearch);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiScale = String(uiScale);
    document.documentElement.style.setProperty("--ui-zoom", String(uiScale / 100));
    document.documentElement.style.setProperty("--ui-inverse", `${10000 / uiScale}%`);
    document.documentElement.style.setProperty(
      "--editor-font-size",
      `${editorFontSize}px`,
    );
    localStorage.setItem("novel-studio:ui-scale", String(uiScale));
    localStorage.setItem(
      "novel-studio:editor-font-size",
      String(editorFontSize),
    );
  }, [editorFontSize, uiScale]);

  useEffect(() => {
    localStorage.setItem(
      "novel-studio:research-peek-pinned",
      String(researchPeekPinned),
    );
    localStorage.setItem(
      "novel-studio:research-peek-width",
      String(researchPeekWidth),
    );
  }, [researchPeekPinned, researchPeekWidth]);

  const selectedNode = project?.nodes.find((node) => node.id === selectedId);
  const selectedInspiration = project?.inspirations.find(
    (item) => item.id === selectedInspirationId,
  );
  const selectedDocument =
    selectedNode?.documentId && project
      ? project.documents[selectedNode.documentId]
      : undefined;
  const scenes = useMemo(
    () => (project ? manuscriptScenes(project) : []),
    [project],
  );
  const selectedSceneLinks = useMemo(
    () =>
      project && selectedNode
        ? project.sceneEntityLinks.filter(
            (link) => link.sceneId === selectedNode.id,
          )
        : [],
    [project, selectedNode],
  );
  const selectedPovEntity = project?.entities.find(
    (entity) =>
      entity.id ===
      selectedSceneLinks.find((link) => link.role === "pov")?.entityId,
  );
  const selectedLocationEntity = project?.entities.find(
    (entity) =>
      entity.id ===
      selectedSceneLinks.find((link) => link.role === "location")?.entityId,
  );

  const tagsForTarget = (
    targetType: "scene" | "inspiration" | "entity" | "research",
    targetId: string,
  ) => {
    const linkedIds = new Set(
      project?.tagLinks
        .filter(
          (link) =>
            link.targetType === targetType && link.targetId === targetId,
        )
        .map((link) => link.tagId) ?? [],
    );
    return project?.tags.filter((tag) => linkedIds.has(tag.id)) ?? [];
  };

  if (!project) {
    return (
      <div className="app-loading">
        <div className="brand-mark">N</div>
        <span>準備寫作空間…</span>
      </div>
    );
  }

  const patchNode = (nodeId: string, patch: Partial<ProjectNode>) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            updatedAt,
            nodes: current.nodes.map((node) =>
              node.id === nodeId ? { ...node, ...patch, updatedAt } : node,
            ),
          }
        : current,
    );
  };

  const updateDocument = (
    content: RichTextDocument,
    plainText: string,
  ): void => {
    if (!selectedNode?.documentId) return;
    const updatedAt = new Date().toISOString();
    const documentId = selectedNode.documentId;
    setProject((current) => {
      if (!current) return current;
      const currentDocument = current.documents[documentId];
      return {
        ...current,
        updatedAt,
        nodes: current.nodes.map((node) =>
          node.id === selectedNode.id
            ? { ...node, wordCount: countWords(plainText), updatedAt }
            : node,
        ),
        documents: {
          ...current.documents,
          [documentId]: {
            ...currentDocument,
            content,
            plainText,
            revision: currentDocument.revision + 1,
            updatedAt,
          },
        },
      };
    });
  };

  const selectNode = (id: string) => {
    const node = project.nodes.find((candidate) => candidate.id === id);
    setSelectedId(id);
    setSelectedInspirationId(null);
    if (node?.kind === "scene") setView("editor");
    if (!researchPeekPinned) setResearchPeekOpen(false);
  };

  const addScene = () => {
    const volumeId =
      selectedNode?.kind === "folder"
        ? selectedNode.id
        : selectedNode?.parentId ?? "volume-1";
    const siblings = project.nodes.filter(
      (node) => node.parentId === volumeId && node.kind === "scene",
    );
    const nodeId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const newNode: ProjectNode = {
      id: nodeId,
      parentId: volumeId,
      kind: "scene",
      title: `${String(scenes.length + 1).padStart(2, "0")}　未命名場景`,
      synopsis: "",
      status: "構思",
      sortOrder: siblings.length,
      wordCount: 0,
      targetWords: 1800,
      documentId,
      updatedAt,
    };

    setProject((current) =>
      current
        ? {
            ...current,
            updatedAt,
            nodes: [...current.nodes, newNode],
            documents: {
              ...current.documents,
              [documentId]: {
                id: documentId,
                content: { type: "doc", content: [{ type: "paragraph" }] },
                plainText: "",
                revision: 1,
                updatedAt,
              },
            },
            timelineEvents: [
              ...current.timelineEvents,
              timelineEventForScene(newNode, current.timelineEvents),
            ],
          }
        : current,
    );
    setSelectedId(nodeId);
    setSelectedInspirationId(null);
    setView("editor");
    setSection("manuscript");
  };

  const addInspiration = () => {
    const now = new Date().toISOString();
    const item: InspirationItem = {
      id: crypto.randomUUID(),
      title: "未命名靈感",
      content: "",
      kind: "note",
      status: "inbox",
      linkedNodeIds: [],
      linkedEntityIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setProject((current) =>
      current
        ? {
            ...current,
            inspirations: [item, ...current.inspirations],
            updatedAt: now,
          }
        : current,
    );
    setSelectedInspirationId(item.id);
    setSection("manuscript");
    setView("editor");
  };

  const selectInspiration = (id: string) => {
    setSelectedInspirationId(id);
    setSection("manuscript");
    setView("editor");
  };

  const patchInspiration = (
    inspirationId: string,
    patch: Partial<InspirationItem>,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            updatedAt,
            inspirations: current.inspirations.map((item) =>
              item.id === inspirationId
                ? { ...item, ...patch, updatedAt }
                : item,
            ),
          }
        : current,
    );
  };

  const updateTargetTags = (
    targetType: "scene" | "inspiration" | "entity" | "research",
    targetId: string,
    names: string[],
  ) => {
    const normalizedNames = Array.from(
      new Map(
        names
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => [name.toLocaleLowerCase("zh-TW"), name]),
      ).values(),
    );
    const updatedAt = new Date().toISOString();

    setProject((current) => {
      if (!current) return current;
      const tags = [...current.tags];
      const desiredTags = normalizedNames.map((name) => {
        const existing = tags.find(
          (tag) =>
            tag.name.toLocaleLowerCase("zh-TW") ===
            name.toLocaleLowerCase("zh-TW"),
        );
        if (existing) return existing;
        const created = {
          id: crypto.randomUUID(),
          name,
          category: "custom" as const,
          color: "#8b91a6",
          createdAt: updatedAt,
        };
        tags.push(created);
        return created;
      });
      const remainingLinks = current.tagLinks.filter(
        (link) =>
          !(link.targetType === targetType && link.targetId === targetId),
      );
      return {
        ...current,
        tags,
        tagLinks: [
          ...remainingLinks,
          ...desiredTags.map((tag) => ({
            id: crypto.randomUUID(),
            tagId: tag.id,
            targetType,
            targetId,
            createdAt: updatedAt,
          })),
        ],
        updatedAt,
      };
    });
  };

  const updateSceneEntity = (
    sceneId: string,
    role: EntityLinkRole,
    entityId: string,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) => {
      if (!current) return current;
      const withoutRole = current.sceneEntityLinks.filter(
        (link) => !(link.sceneId === sceneId && link.role === role),
      );
      return {
        ...current,
        sceneEntityLinks: entityId
          ? [
              ...withoutRole,
              {
                id: crypto.randomUUID(),
                sceneId,
                entityId,
                role,
                source: "manual" as const,
                createdAt: updatedAt,
              },
            ]
          : withoutRole,
        updatedAt,
      };
    });
  };

  const linkInspirationEntity = (
    inspirationId: string,
    entityId: string,
  ) => {
    const item = project.inspirations.find(
      (candidate) => candidate.id === inspirationId,
    );
    if (!item || item.linkedEntityIds.includes(entityId)) return;
    patchInspiration(inspirationId, {
      linkedEntityIds: [...item.linkedEntityIds, entityId],
    });
  };

  const unlinkInspirationEntity = (
    inspirationId: string,
    entityId: string,
  ) => {
    const item = project.inspirations.find(
      (candidate) => candidate.id === inspirationId,
    );
    if (!item) return;
    patchInspiration(inspirationId, {
      linkedEntityIds: item.linkedEntityIds.filter((id) => id !== entityId),
    });
  };

  const convertInspirationToScene = (item: InspirationItem) => {
    const volumeId =
      selectedNode?.kind === "folder"
        ? selectedNode.id
        : selectedNode?.parentId ?? "volume-1";
    const siblings = project.nodes.filter(
      (node) => node.parentId === volumeId && node.kind === "scene",
    );
    const nodeId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const plainText = item.content.trim();
    const paragraphs = plainText
      ? plainText.split(/\n+/).map((text) => ({
          type: "paragraph",
          content: [{ type: "text", text }],
        }))
      : [{ type: "paragraph" }];
    const newNode: ProjectNode = {
      id: nodeId,
      parentId: volumeId,
      kind: "scene",
      title: `${String(scenes.length + 1).padStart(2, "0")}　${item.title}`,
      synopsis: item.content.slice(0, 160),
      status: "構思",
      sortOrder: siblings.length,
      wordCount: countWords(plainText),
      targetWords: 1800,
      documentId,
      updatedAt,
    };

    setProject((current) =>
      current
        ? {
            ...current,
            updatedAt,
            nodes: [...current.nodes, newNode],
            documents: {
              ...current.documents,
              [documentId]: {
                id: documentId,
                content: { type: "doc", content: paragraphs },
                plainText,
                revision: 1,
                updatedAt,
              },
            },
            sceneEntityLinks: [
              ...current.sceneEntityLinks,
              ...item.linkedEntityIds.map((entityId) => ({
                id: crypto.randomUUID(),
                sceneId: nodeId,
                entityId,
                role: "subject" as const,
                source: "manual" as const,
                createdAt: updatedAt,
              })),
            ],
            inspirations: current.inspirations.map((candidate) =>
              candidate.id === item.id
                ? {
                    ...candidate,
                    status: "used" as const,
                    linkedNodeIds: [...candidate.linkedNodeIds, nodeId],
                    updatedAt,
                  }
                : candidate,
            ),
            tagLinks: [
              ...current.tagLinks,
              ...current.tagLinks
                .filter(
                  (link) =>
                    link.targetType === "inspiration" &&
                    link.targetId === item.id,
                )
                .map((link) => ({
                  ...link,
                  id: crypto.randomUUID(),
                  targetType: "scene" as const,
                  targetId: nodeId,
                  createdAt: updatedAt,
                })),
            ],
            timelineEvents: [
              ...current.timelineEvents,
              timelineEventForScene(
                newNode,
                current.timelineEvents,
                item.linkedEntityIds,
              ),
            ],
          }
        : current,
    );
    setSelectedId(nodeId);
    setSelectedInspirationId(null);
    setView("editor");
    showNotice("靈感已轉成場景，原始構思仍保留在靈感庫");
  };

  const archiveInspiration = (item: InspirationItem) => {
    patchInspiration(item.id, { status: "archived" });
    setSelectedInspirationId(null);
    showNotice("靈感已封存，不會再顯示於左側清單");
  };

  const createWorldEntity = (type: EntityType): string => {
    const now = new Date().toISOString();
    const labels: Record<EntityType, string> = {
      character: "未命名人物",
      location: "未命名地點",
      faction: "未命名勢力",
      item: "未命名物品",
      lore: "未命名設定",
      term: "未命名詞彙",
    };
    const colors: Record<EntityType, string> = {
      character: "#d88d68",
      location: "#65a291",
      faction: "#7b88b8",
      item: "#b39457",
      lore: "#9175aa",
      term: "#718b9a",
    };
    const entity: StoryEntity = {
      id: crypto.randomUUID(),
      type,
      name: labels[type],
      aliases: [],
      summary: "",
      color: colors[type],
      attributes: {},
      createdAt: now,
      updatedAt: now,
    };
    setProject((current) =>
      current
        ? {
            ...current,
            entities: [...current.entities, entity],
            updatedAt: now,
          }
        : current,
    );
    return entity.id;
  };

  const patchWorldEntity = (
    entityId: string,
    patch: Partial<StoryEntity>,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            entities: current.entities.map((entity) =>
              entity.id === entityId
                ? { ...entity, ...patch, id: entity.id, updatedAt }
                : entity,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const createEntityRelation = (
    fromEntityId: string,
    toEntityId: string,
    label: string,
    notes: string,
  ) => {
    const now = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            entityRelations: [
              ...current.entityRelations,
              {
                id: crypto.randomUUID(),
                fromEntityId,
                toEntityId,
                type: "custom",
                label,
                notes,
                sourceNodeIds: [],
                createdAt: now,
                updatedAt: now,
              },
            ],
            updatedAt: now,
          }
        : current,
    );
  };

  const removeEntityRelation = (relationId: string) => {
    if (!window.confirm("確定移除這條關係？實體資料本身不會被刪除。")) return;
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            entityRelations: current.entityRelations.filter(
              (relation) => relation.id !== relationId,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const openWorldScene = (sceneId: string) => {
    setSelectedId(sceneId);
    setSelectedInspirationId(null);
    setSection("manuscript");
    setView("editor");
    if (!researchPeekPinned) setResearchPeekOpen(false);
  };

  const openWorldInspiration = (inspirationId: string) => {
    setSelectedInspirationId(inspirationId);
    setSection("manuscript");
    setView("editor");
  };

  const openWorldResearch = (researchId: string) => {
    setSelectedResearchId(researchId);
    setSection("research");
  };

  const createTimelineEvent = (): string => {
    const now = new Date().toISOString();
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      title: "未命名事件",
      summary: "",
      kind: "world-event",
      status: "planned",
      storyTimeLabel: "未設定故事時間",
      storyOrder:
        Math.max(0, ...project.timelineEvents.map((item) => item.storyOrder)) + 1,
      narrativeOrder:
        Math.max(
          0,
          ...project.timelineEvents.map((item) => item.narrativeOrder),
        ) + 1,
      importance: 3,
      linkedNodeIds: [],
      linkedEntityIds: [],
      color: "#7b87b8",
      createdAt: now,
      updatedAt: now,
    };
    setProject((current) =>
      current
        ? {
            ...current,
            timelineEvents: [...current.timelineEvents, event],
            updatedAt: now,
          }
        : current,
    );
    return event.id;
  };

  const patchTimelineEvent = (
    eventId: string,
    patch: Partial<TimelineEvent>,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            timelineEvents: current.timelineEvents.map((event) =>
              event.id === eventId
                ? { ...event, ...patch, id: event.id, updatedAt }
                : event,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const moveEventOnTimeline = (
    eventId: string,
    direction: -1 | 1,
    axis: TimelineAxis,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            timelineEvents: moveTimelineEvent(
              current.timelineEvents,
              eventId,
              direction,
              axis,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const removeTimelineEvent = (eventId: string) => {
    if (!window.confirm("確定刪除這個時間事件？場景與世界觀資料不會被刪除。")) return;
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            timelineEvents: current.timelineEvents.filter(
              (event) => event.id !== eventId,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const createResearchItem = (kind: "note" | "web"): string => {
    const now = new Date().toISOString();
    const item: ResearchItem = {
      id: crypto.randomUUID(),
      title: kind === "web" ? "未命名網頁來源" : "未命名研究筆記",
      kind,
      status: "inbox",
      summary: "",
      notes: "",
      sourceUrl: "",
      citation: {
        author: "",
        publisher: "",
        publishedAt: "",
        accessedAt: now.slice(0, 10),
      },
      originalFileName: "",
      mediaType: kind === "web" ? "text/html" : "text/plain",
      byteSize: 0,
      dataUrl: "",
      linkedNodeIds: [],
      linkedEntityIds: [],
      linkedInspirationIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setProject((current) =>
      current
        ? {
            ...current,
            researchItems: [item, ...current.researchItems],
            updatedAt: now,
          }
        : current,
    );
    return item.id;
  };

  const importResearchAttachment = async (): Promise<string | null> => {
    try {
      const imported = await importResearchFile();
      if (!imported) return null;
      const now = new Date().toISOString();
      const item: ResearchItem = {
        id: crypto.randomUUID(),
        title: imported.fileName.replace(/\.[^.]+$/, ""),
        kind: imported.kind,
        status: "inbox",
        summary: "",
        notes: "",
        sourceUrl: "",
        citation: {
          author: "",
          publisher: "",
          publishedAt: "",
          accessedAt: now.slice(0, 10),
        },
        originalFileName: imported.fileName,
        mediaType: imported.mediaType,
        byteSize: imported.byteSize,
        dataUrl: imported.dataUrl,
        linkedNodeIds: [],
        linkedEntityIds: [],
        linkedInspirationIds: [],
        createdAt: now,
        updatedAt: now,
      };
      setProject((current) =>
        current
          ? {
              ...current,
              researchItems: [item, ...current.researchItems],
              updatedAt: now,
            }
          : current,
      );
      showNotice(`已匯入研究附件 · ${imported.fileName}`);
      return item.id;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "匯入研究附件失敗。";
      window.alert(message);
      return null;
    }
  };

  const captureQuickText = async (
    value: string,
    linkedInspirationId: string | null = selectedInspiration?.id ?? null,
  ) => {
    const captured = classifyQuickText(value);
    if (!captured) return;
    const now = new Date().toISOString();

    if (captured.type === "web") {
      const existing = project.researchItems.find(
        (item) => item.sourceUrl.trim() === captured.url,
      );
      if (existing) {
        if (
          linkedInspirationId &&
          !existing.linkedInspirationIds.includes(linkedInspirationId)
        ) {
          patchResearchItem(existing.id, {
            linkedInspirationIds: [
              ...existing.linkedInspirationIds,
              linkedInspirationId,
            ],
          });
        }
        showNotice("這個網址已在研究素材中，已沿用既有資料");
        return;
      }
      const item: ResearchItem = {
        id: crypto.randomUUID(),
        title: captured.title,
        kind: "web",
        status: "inbox",
        summary: "",
        notes: "",
        sourceUrl: captured.url,
        citation: {
          author: "",
          publisher: new URL(captured.url).hostname,
          publishedAt: "",
          accessedAt: now.slice(0, 10),
        },
        originalFileName: "",
        mediaType: "text/html",
        byteSize: 0,
        dataUrl: "",
        linkedNodeIds: [],
        linkedEntityIds: [],
        linkedInspirationIds: linkedInspirationId ? [linkedInspirationId] : [],
        createdAt: now,
        updatedAt: now,
      };
      setProject((current) =>
        current
          ? {
              ...current,
              researchItems: [item, ...current.researchItems],
              updatedAt: now,
            }
          : current,
      );
      showNotice(linkedInspirationId ? "網址已存為研究素材並連結靈感" : "網址已自動存入研究素材");
      return;
    }

    const item: InspirationItem = {
      id: crypto.randomUUID(),
      title: captured.title,
      content: captured.content,
      kind: captured.kind,
      status: "inbox",
      linkedNodeIds: [],
      linkedEntityIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setProject((current) =>
      current
        ? {
            ...current,
            inspirations: [item, ...current.inspirations],
            updatedAt: now,
          }
        : current,
    );
    showNotice("文字已自動分類並放入靈感庫");
  };

  const captureQuickFiles = async (
    files: File[],
    linkedInspirationId: string | null = selectedInspiration?.id ?? null,
  ) => {
    try {
      const imported = await Promise.all(
        files.map((file) => importResearchFileObject(file)),
      );
      const now = new Date().toISOString();
      setProject((current) => {
        if (!current) return current;
        const signatures = new Set(
          current.researchItems.map(
            (item) => `${item.originalFileName}|${item.byteSize}|${item.mediaType}`,
          ),
        );
        const newItems: ResearchItem[] = [];
        let researchItems = current.researchItems.map((item) => ({ ...item }));
        for (const file of imported) {
          const signature = `${file.fileName}|${file.byteSize}|${file.mediaType}`;
          const duplicateIndex = researchItems.findIndex(
            (item) =>
              `${item.originalFileName}|${item.byteSize}|${item.mediaType}` === signature,
          );
          if (signatures.has(signature)) {
            if (
              linkedInspirationId &&
              duplicateIndex >= 0 &&
              !researchItems[duplicateIndex].linkedInspirationIds.includes(
                linkedInspirationId,
              )
            ) {
              researchItems[duplicateIndex] = {
                ...researchItems[duplicateIndex],
                linkedInspirationIds: [
                  ...researchItems[duplicateIndex].linkedInspirationIds,
                  linkedInspirationId,
                ],
                updatedAt: now,
              };
            }
            continue;
          }
          signatures.add(signature);
          newItems.push({
            id: crypto.randomUUID(),
            title: file.fileName.replace(/\.[^.]+$/, "") || "剪貼簿圖片",
            kind: file.kind,
            status: "inbox",
            summary: "",
            notes: "",
            sourceUrl: "",
            citation: {
              author: "",
              publisher: "",
              publishedAt: "",
              accessedAt: now.slice(0, 10),
            },
            originalFileName: file.fileName,
            mediaType: file.mediaType,
            byteSize: file.byteSize,
            dataUrl: file.dataUrl,
            linkedNodeIds: [],
            linkedEntityIds: [],
            linkedInspirationIds: linkedInspirationId ? [linkedInspirationId] : [],
            createdAt: now,
            updatedAt: now,
          });
        }
        return {
          ...current,
          researchItems: [...newItems, ...researchItems],
          updatedAt: now,
        };
      });
      showNotice(
        linkedInspirationId
          ? `素材已匯入並連結目前靈感 · ${files.length} 份`
          : `素材已自動分類 · ${files.length} 份`,
      );
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "快速匯入素材失敗。");
    }
  };

  const patchResearchItem = (
    itemId: string,
    patch: Partial<ResearchItem>,
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            researchItems: current.researchItems.map((item) =>
              item.id === itemId
                ? { ...item, ...patch, id: item.id, updatedAt }
                : item,
            ),
            updatedAt,
          }
        : current,
    );
  };

  const removeResearchItem = (itemId: string) => {
    if (!window.confirm("確定刪除這份研究素材？嵌入的附件也會從專案移除。")) return;
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            researchItems: current.researchItems.filter(
              (item) => item.id !== itemId,
            ),
            tagLinks: current.tagLinks.filter(
              (link) =>
                !(link.targetType === "research" && link.targetId === itemId),
            ),
            updatedAt,
          }
        : current,
    );
  };

  const exportResearchAttachment = async (item: ResearchItem) => {
    try {
      const saved = await saveResearchAttachment(
        item.originalFileName,
        item.mediaType,
        item.dataUrl,
      );
      if (saved) showNotice("研究附件已另存");
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "另存附件失敗。");
    }
  };

  const runAiScan = async () => {
    setAiScanning(true);
    await new Promise<void>((resolve) =>
      window.setTimeout(() => resolve(), 80),
    );
    const detected = analyzeProjectLocally(project);
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? {
            ...current,
            aiFindings: mergeAiFindings(current.aiFindings, detected),
            updatedAt,
          }
        : current,
    );
    setAiScanning(false);
    showNotice(`本機分析完成 · 找到 ${detected.length} 項候選`);
  };

  const reviewAiFinding = (
    finding: AiFinding,
    status: "accepted" | "dismissed",
  ) => {
    const updatedAt = new Date().toISOString();
    setProject((current) =>
      current
        ? applyAiReview(current, finding, status, updatedAt)
        : current,
    );
    showNotice(status === "accepted" ? "建議已核准並套用" : "建議已略過");
  };

  const openAiTarget = (finding: AiFinding) => {
    if (finding.targetType === "scene") {
      openWorldScene(finding.targetId);
      return;
    }
    if (finding.targetType === "entity") {
      setSelectedWorldEntityId(finding.targetId);
      setSection("world");
      return;
    }
    if (finding.targetType === "timeline") {
      setSelectedTimelineEventId(finding.targetId);
      setSection("timeline");
    }
  };

  const chooseSection = (next: Section) => {
    setSection(next);
    if (next === "manuscript") setView("editor");
    if (next !== "manuscript" && !researchPeekPinned) setResearchPeekOpen(false);
  };

  const openSearchResult = (result: ProjectSearchResult) => {
    if (result.kind === "scene" || result.kind === "document") {
      selectNode(result.targetId);
      setSection("manuscript");
      return;
    }
    if (result.kind === "entity") {
      setSelectedWorldEntityId(result.targetId);
      setSection("world");
      return;
    }
    if (result.kind === "timeline") {
      setSelectedTimelineEventId(result.targetId);
      setSection("timeline");
      return;
    }
    if (result.kind === "research") {
      setSelectedResearchId(result.targetId);
      setSection("research");
      return;
    }
    selectInspiration(result.targetId);
  };

  const createSnapshot = async () => {
    const timestamp = new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());

    try {
      setSaveState("saving");
      await repository.createSnapshot(project, `手動快照 ${timestamp}`);
      if (backupDialogOpen) {
        setSnapshots(await repository.listSnapshots(project.id));
      }
      setStorageError(null);
      setSaveState("saved");
      setSnapshotNotice(`已建立快照 · ${timestamp}`);
      window.setTimeout(() => setSnapshotNotice(null), 2600);
    } catch (error: unknown) {
      setStorageError(
        error instanceof Error ? error.message : "建立專案快照失敗。",
      );
      setSaveState("error");
    }
  };

  const showNotice = (message: string) => {
    setSnapshotNotice(message);
    window.setTimeout(() => setSnapshotNotice(null), 3200);
  };

  const exportProject = async () => {
    setTransferMenuOpen(false);
    setOperationBusy(true);
    try {
      await repository.save(project);
      const result = await exportPortableProject(project);
      if (!result.cancelled) {
        showNotice("專案已匯出，可複製到另一台電腦");
      }
    } catch (error: unknown) {
      setStorageError(
        error instanceof Error ? error.message : "專案匯出失敗。",
      );
      setSaveState("error");
    } finally {
      setOperationBusy(false);
    }
  };

  const importProject = async () => {
    setTransferMenuOpen(false);
    setOperationBusy(true);
    try {
      const imported = await importPortableProject();
      if (!imported) return;
      const confirmed = window.confirm(
        `要匯入「${imported.project.title}」嗎？\n\n目前的作品會先建立安全備份，再換成匯入的內容。`,
      );
      if (!confirmed) return;

      const timestamp = new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date());
      await repository.createSnapshot(project, `匯入前備份 · ${timestamp}`);
      await repository.save(imported.project);
      setProject(structuredClone(imported.project));
      const firstScene = manuscriptScenes(imported.project)[0];
      setSelectedId(firstScene?.id ?? imported.project.nodes[0]?.id ?? "");
      setSelectedInspirationId(null);
      setSection("manuscript");
      setView("editor");
      setStorageError(null);
      setSaveState("saved");
      showNotice(`已匯入 ${imported.sourceName}`);
    } catch (error: unknown) {
      setStorageError(
        error instanceof Error ? error.message : "專案匯入失敗。",
      );
      setSaveState("error");
      window.alert(
        error instanceof Error ? error.message : "專案匯入失敗。",
      );
    } finally {
      setOperationBusy(false);
    }
  };

  const openBackupDialog = async () => {
    setTransferMenuOpen(false);
    setBackupDialogOpen(true);
    setOperationBusy(true);
    try {
      setSnapshots(await repository.listSnapshots(project.id));
    } catch (error: unknown) {
      setStorageError(
        error instanceof Error ? error.message : "無法讀取備份。",
      );
    } finally {
      setOperationBusy(false);
    }
  };

  const restoreSnapshot = async (snapshot: ProjectSnapshot) => {
    const confirmed = window.confirm(
      `要還原「${snapshot.label}」嗎？\n\n目前內容也會先建立一份安全備份。`,
    );
    if (!confirmed) return;

    setOperationBusy(true);
    try {
      const timestamp = new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date());
      await repository.createSnapshot(project, `還原前備份 · ${timestamp}`);
      await repository.save(snapshot.project);
      setProject(structuredClone(snapshot.project));
      const firstScene = manuscriptScenes(snapshot.project)[0];
      setSelectedId(firstScene?.id ?? snapshot.project.nodes[0]?.id ?? "");
      setSelectedInspirationId(null);
      setBackupDialogOpen(false);
      setStorageError(null);
      setSaveState("saved");
      showNotice(`已還原 ${snapshot.label}`);
    } catch (error: unknown) {
      setStorageError(
        error instanceof Error ? error.message : "備份還原失敗。",
      );
      setSaveState("error");
    } finally {
      setOperationBusy(false);
    }
  };

  return (
    <div className={`app-shell ${focusMode && section === "manuscript" ? "typewriter-mode" : ""}`}>
      {focusMode && section === "manuscript" && <div className="typewriter-controls">
        <span>深夜書房 · {saveState === "saved" ? "已儲存" : saveState === "saving" ? "儲存中…" : "儲存失敗，請退出檢查"}</span>
        <button onClick={() => setResearchPeekOpen(open => !open)} aria-pressed={researchPeekOpen}>參考浮窗</button>
        <button onClick={() => setFocusMode(false)}>退出專注 · Esc</button>
      </div>}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>Novel Studio</strong>
            <span>本機優先創作空間</span>
          </div>
        </div>
        <div className="project-identity">
          <span>{project.subtitle}</span>
          <strong>{project.title}</strong>
        </div>
        <div className="topbar-actions">
          <VersionInfo />
          <button
            className="search-button"
            onClick={() => setSearchOpen(true)}
            aria-label="搜尋整個專案"
          >
            <Search size={15} />
            <span>搜尋專案</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button
            className="capture-button"
            onClick={() => setQuickCaptureOpen(true)}
            title="快速貼上網址、圖片、文件或靈感"
          >
            <ClipboardPaste size={15} />
            <span>快速收集</span>
          </button>
          <div
            className={`save-indicator ${saveState}`}
            title={storageError ?? undefined}
          >
            {saveState === "saved" ? (
              <Check size={14} />
            ) : saveState === "saving" ? (
              <CloudOff size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {saveState === "saved"
              ? "已儲存"
              : saveState === "saving"
                ? "儲存中"
                : "儲存失敗"}
          </div>
          <button
            className="icon-button"
            title="建立專案快照"
            aria-label="建立專案快照"
            onClick={createSnapshot}
          >
            <History size={17} />
          </button>
          <div className="project-menu-wrap">
            <button
              className="icon-button"
              title="專案與備份"
              aria-label="開啟專案與備份選單"
              aria-expanded={transferMenuOpen}
              onClick={() => setTransferMenuOpen((open) => !open)}
              disabled={operationBusy}
            >
              <MoreHorizontal size={18} />
            </button>
            {transferMenuOpen && (
              <div className="project-menu" role="menu">
                <div className="project-menu-heading">
                  <strong>專案與備份</strong>
                  <span>帶到另一台電腦繼續寫</span>
                </div>
                <button role="menuitem" onClick={exportProject}>
                  <Download size={17} />
                  <span>
                    <strong>匯出專案</strong>
                    <small>儲存為單一 .novel 檔</small>
                  </span>
                </button>
                <button role="menuitem" onClick={importProject}>
                  <Upload size={17} />
                  <span>
                    <strong>匯入專案</strong>
                    <small>從其他電腦接續作品</small>
                  </span>
                </button>
                <button role="menuitem" onClick={openBackupDialog}>
                  <ArchiveRestore size={17} />
                  <span>
                    <strong>備份與還原</strong>
                    <small>查看自動及手動備份</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="module-rail" aria-label="主要模組">
        <div className="rail-top">
          {sectionItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => chooseSection(id)}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="rail-bottom">
          <button title="元件">
            <Blocks size={19} />
          </button>
          <button title="設定" onClick={() => setSettingsOpen(true)}>
            <Settings size={19} />
          </button>
          <div className="user-avatar">F</div>
        </div>
      </nav>

      {section === "manuscript" ? (
        <>
          <Binder
            nodes={project.nodes}
            selectedId={selectedId}
            inspirations={project.inspirations}
            tags={project.tags}
            tagLinks={project.tagLinks}
            selectedInspirationId={selectedInspirationId}
            onSelect={selectNode}
            onAddScene={addScene}
            onSelectInspiration={selectInspiration}
            onAddInspiration={addInspiration}
          />

          <main
            className={`workspace ${!selectedInspiration && inspectorOpen && view === "editor" ? "with-inspector" : ""}`}
          >
            <div className="workspace-toolbar">
              <div className="breadcrumb">
                {selectedInspiration ? (
                  <>
                    <span>靈感庫</span>
                    <ChevronRight size={13} />
                    <strong>{selectedInspiration.title}</strong>
                  </>
                ) : (
                  <>
                    <span>正文</span>
                    <ChevronRight size={13} />
                    <span>
                      {selectedNode?.parentId === "volume-2"
                        ? "第二部"
                        : "第一部"}
                    </span>
                    {selectedNode?.kind === "scene" && (
                      <>
                        <ChevronRight size={13} />
                        <strong>{selectedNode.title}</strong>
                      </>
                    )}
                  </>
                )}
              </div>
              {selectedInspiration ? (
                <span className="idea-workspace-label">未定構思</span>
              ) : (
                <div className="view-switcher">
                  <button
                    className={view === "editor" ? "active" : ""}
                    onClick={() => setView("editor")}
                    title="編輯器"
                  >
                    <Columns3 size={15} />
                    編輯
                  </button>
                  <button
                    className={view === "corkboard" ? "active" : ""}
                    onClick={() => setView("corkboard")}
                    title="卡片"
                  >
                    <LayoutGrid size={15} />
                    卡片
                  </button>
                  <button
                    className={view === "outliner" ? "active" : ""}
                    onClick={() => setView("outliner")}
                    title="大綱"
                  >
                    <ListTree size={15} />
                    大綱
                  </button>
                </div>
              )}
              {!selectedInspiration && (
                <div className="workspace-tool-actions">
                  {view === "editor" && selectedNode?.kind === "scene" && selectedDocument && <button className="typewriter-entry" onClick={() => setFocusMode(true)}>打字機</button>}
                  <button
                    className={`icon-button quiet ${researchPeekOpen ? "active" : ""}`}
                    title="研究浮窗（Ctrl+Shift+R）"
                    onClick={() => setResearchPeekOpen((open) => !open)}
                  >
                    <FileSearch size={17} />
                  </button>
                  <button
                    className="icon-button quiet inspector-toggle"
                    title={inspectorOpen ? "關閉檢查器" : "開啟檢查器"}
                    onClick={() => setInspectorOpen((open) => !open)}
                  >
                    {inspectorOpen ? (
                      <PanelRightClose size={18} />
                    ) : (
                      <PanelRightOpen size={18} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {selectedInspiration ? (
              <InspirationEditor
                item={selectedInspiration}
                tags={tagsForTarget("inspiration", selectedInspiration.id)}
                linkedEntities={project.entities.filter((entity) =>
                  selectedInspiration.linkedEntityIds.includes(entity.id),
                )}
                availableEntities={project.entities}
                linkedResearch={project.researchItems.filter((item) =>
                  item.linkedInspirationIds.includes(selectedInspiration.id),
                )}
                onChange={(patch) =>
                  patchInspiration(selectedInspiration.id, patch)
                }
                onTagsChange={(names) =>
                  updateTargetTags(
                    "inspiration",
                    selectedInspiration.id,
                    names,
                  )
                }
                onLinkEntity={(entityId) =>
                  linkInspirationEntity(selectedInspiration.id, entityId)
                }
                onUnlinkEntity={(entityId) =>
                  unlinkInspirationEntity(selectedInspiration.id, entityId)
                }
                onConvertToScene={() =>
                  convertInspirationToScene(selectedInspiration)
                }
                onArchive={() => archiveInspiration(selectedInspiration)}
                onCaptureFiles={(files) =>
                  captureQuickFiles(files, selectedInspiration.id)
                }
                onCaptureUrl={(url) =>
                  captureQuickText(url, selectedInspiration.id)
                }
                onOpenResearch={openWorldResearch}
              />
            ) : view === "editor" && selectedNode?.kind === "scene" && selectedDocument ? (
              <div className="editor-view">
                <div className="editor-paper">
                  <div className="scene-heading">
                    <div className="scene-kicker">
                      <span className={`status-pill status-${selectedNode.status}`}>
                        {selectedNode.status}
                      </span>
                      <span>{selectedPovEntity?.name ?? "未設定視角"}</span>
                      <span>·</span>
                      <span>{selectedLocationEntity?.name ?? "未設定地點"}</span>
                    </div>
                    <input
                      value={selectedNode.title}
                      aria-label="場景標題"
                      onChange={(event) =>
                        patchNode(selectedNode.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <StoryEditor
                    typewriter={focusMode}
                    documentId={selectedDocument.id}
                    content={selectedDocument.content}
                    onChange={updateDocument}
                  />
                  <div className="editor-statusbar">
                    <span>{selectedNode.wordCount.toLocaleString()} 字</span>
                    <span>修訂 {selectedDocument.revision}</span>
                    <span>UTF-8</span>
                  </div>
                </div>
              </div>
            ) : view === "corkboard" ? (
              <Corkboard
                scenes={scenes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={(id, direction) =>
                  setProject((current) =>
                    current
                      ? { ...current, nodes: moveSibling(current.nodes, id, direction) }
                      : current,
                  )
                }
              />
            ) : view === "outliner" ? (
              <Outliner
                scenes={scenes}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <div className="folder-summary">
                <BookOpenText size={32} />
                <h1>{selectedNode?.title}</h1>
                <p>{selectedNode?.synopsis}</p>
              </div>
            )}

            {!selectedInspiration && view === "editor" && inspectorOpen && selectedNode?.kind === "scene" && (
              <Inspector
                node={selectedNode}
                entities={project.entities}
                povEntityId={selectedPovEntity?.id ?? ""}
                locationEntityId={selectedLocationEntity?.id ?? ""}
                tagNames={tagsForTarget("scene", selectedNode.id).map(
                  (tag) => tag.name,
                )}
                onChange={(patch) => patchNode(selectedNode.id, patch)}
                onEntityChange={(role, entityId) =>
                  updateSceneEntity(selectedNode.id, role, entityId)
                }
                onTagsChange={(names) =>
                  updateTargetTags("scene", selectedNode.id, names)
                }
              />
            )}
          </main>
        </>
      ) : section === "world" ? (
        <main className="module-workspace world-module-workspace">
          <WorldBible
            project={project}
            focusedEntityId={selectedWorldEntityId}
            onCreateEntity={createWorldEntity}
            onPatchEntity={patchWorldEntity}
            onTagsChange={(entityId, names) =>
              updateTargetTags("entity", entityId, names)
            }
            onCreateRelation={createEntityRelation}
            onRemoveRelation={removeEntityRelation}
            onOpenScene={openWorldScene}
            onOpenInspiration={openWorldInspiration}
            onOpenResearch={openWorldResearch}
          />
        </main>
      ) : section === "timeline" ? (
        <main className="module-workspace timeline-module-workspace">
          <TimelineWorkspace
            project={project}
            focusedEventId={selectedTimelineEventId}
            onCreateEvent={createTimelineEvent}
            onPatchEvent={patchTimelineEvent}
            onMoveEvent={moveEventOnTimeline}
            onRemoveEvent={removeTimelineEvent}
            onOpenScene={openWorldScene}
          />
        </main>
      ) : section === "research" ? (
        <main className="module-workspace research-module-workspace">
          <ResearchLibrary
            project={project}
            focusedItemId={selectedResearchId}
            onCreateItem={createResearchItem}
            onImportFile={importResearchAttachment}
            onPatchItem={patchResearchItem}
            onTagsChange={(itemId, names) =>
              updateTargetTags("research", itemId, names)
            }
            onRemoveItem={removeResearchItem}
            onSaveAttachment={exportResearchAttachment}
            onOpenScene={openWorldScene}
            onOpenInspiration={openWorldInspiration}
            onQuickCapture={() => setQuickCaptureOpen(true)}
          />
        </main>
      ) : section === "compile" ? (
        <main className="module-workspace compile-module-workspace">
          <CompileCenter project={project} onNotice={showNotice} />
        </main>
      ) : section === "ai" ? (
        <main className="module-workspace ai-module-workspace">
          <AiWorkspace
            project={project}
            scanning={aiScanning}
            onScan={runAiScan}
            onAccept={(finding) => reviewAiFinding(finding, "accepted")}
            onDismiss={(finding) => reviewAiFinding(finding, "dismissed")}
            onOpenTarget={openAiTarget}
            onOpenScene={openWorldScene}
          />
        </main>
      ) : (
        <main className="module-workspace">
          <ModulePlaceholder
            module={moduleCopy[section]}
            entityCount={project.entities.length}
          />
        </main>
      )}

      <footer className="global-status">
        <span>{projectWordCount(project).toLocaleString()} 字</span>
        <span>{scenes.length} 個場景</span>
        <span className="offline-badge">
          {repository.kind === "sqlite" ? (
            <HardDrive size={12} />
          ) : (
            <CloudOff size={12} />
          )}
          {repository.label}
        </span>
      </footer>
      {snapshotNotice && (
        <div className="snapshot-toast">
          <Check size={15} />
          {snapshotNotice}
        </div>
      )}
      {backupDialogOpen && (
        <BackupDialog
          project={project}
          snapshots={snapshots}
          busy={operationBusy}
          onClose={() => setBackupDialogOpen(false)}
          onCreate={createSnapshot}
          onRestore={restoreSnapshot}
        />
      )}
      {searchOpen && (
        <ProjectSearchDialog
          project={project}
          onClose={() => setSearchOpen(false)}
          onOpenResult={openSearchResult}
        />
      )}
      {quickCaptureOpen && (
        <QuickCaptureDialog
          onClose={() => setQuickCaptureOpen(false)}
          onCaptureText={captureQuickText}
          onCaptureFiles={captureQuickFiles}
        />
      )}
      {settingsOpen && (
        <AppearanceDialog
          uiScale={uiScale}
          editorFontSize={editorFontSize}
          onUiScale={setUiScale}
          onEditorFontSize={setEditorFontSize}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {section === "manuscript" && researchPeekOpen && (
        <ResearchQuickPanel
          floating={focusMode}
          project={project}
          currentSceneId={selectedNode?.kind === "scene" ? selectedNode.id : null}
          width={researchPeekWidth}
          pinned={researchPeekPinned}
          onWidthChange={setResearchPeekWidth}
          onPinnedChange={setResearchPeekPinned}
          onPatchItem={patchResearchItem}
          onOpenFull={(itemId) => {
            setFocusMode(false);
            openWorldResearch(itemId);
            if (!researchPeekPinned) setResearchPeekOpen(false);
          }}
          onClose={() => setResearchPeekOpen(false)}
        />
      )}
    </div>
  );
}

function AppearanceDialog({
  uiScale,
  editorFontSize,
  onUiScale,
  onEditorFontSize,
  onClose,
}: {
  uiScale: 100 | 110 | 125;
  editorFontSize: number;
  onUiScale: (value: 100 | 110 | 125) => void;
  onEditorFontSize: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="appearance-dialog" role="dialog" aria-modal="true" aria-label="顯示與字級">
        <header>
          <div><span className="eyebrow">READABILITY</span><h2>顯示與字級</h2><p>介面和小說正文可以分開調整。</p></div>
          <button className="icon-button quiet" onClick={onClose} aria-label="關閉設定"><X size={17} /></button>
        </header>
        <div className="appearance-setting">
          <div><strong>介面縮放</strong><span>放大選單、欄位、列表與輔助文字</span></div>
          <div className="appearance-options">
            {([100, 110, 125] as const).map((value) => <button key={value} className={uiScale === value ? "active" : ""} onClick={() => onUiScale(value)}>{value}%</button>)}
          </div>
        </div>
        <div className="appearance-setting">
          <div><strong>小說正文字級</strong><span>只調整編輯器文字，不壓縮其他介面</span></div>
          <label className="editor-font-slider"><input type="range" min="15" max="24" step="1" value={editorFontSize} onChange={(event) => onEditorFontSize(Number(event.target.value))} /><b>{editorFontSize}px</b></label>
        </div>
        <div className="appearance-preview" style={{ fontSize: editorFontSize }}>港口的霧在凌晨前漫過石階，遠處傳來第一聲鐘響。</div>
        <footer><button onClick={onClose}>完成</button></footer>
      </section>
    </div>
  );
}

function BackupDialog({
  project,
  snapshots,
  busy,
  onClose,
  onCreate,
  onRestore,
}: {
  project: StoryProject;
  snapshots: ProjectSnapshot[];
  busy: boolean;
  onClose: () => void;
  onCreate: () => void;
  onRestore: (snapshot: ProjectSnapshot) => void;
}) {
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const comparison = snapshots.find(snapshot => snapshot.id === comparisonId);
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="backup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow">LOCAL SAFETY</span>
            <h2 id="backup-dialog-title">備份與還原</h2>
            <p>每日自動保留一版；匯入或還原前也會建立安全備份。</p>
          </div>
          <button
            className="icon-button quiet"
            onClick={onClose}
            aria-label="關閉備份視窗"
          >
            <X size={19} />
          </button>
        </header>
        <div className="backup-dialog-toolbar">
          <span>{snapshots.length} 份本機備份</span>
          <button onClick={onCreate} disabled={busy}>
            <FileArchive size={15} />
            立即備份
          </button>
        </div>
        <div className="backup-list">
          {busy && snapshots.length === 0 ? (
            <div className="backup-empty">正在讀取備份…</div>
          ) : snapshots.length === 0 ? (
            <div className="backup-empty">
              <FileArchive size={30} />
              <strong>尚未建立備份</strong>
              <span>按下「立即備份」保存目前版本。</span>
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <article key={snapshot.id}>
                <div className="backup-icon">
                  <FileArchive size={18} />
                </div>
                <div>
                  <strong>{snapshot.label}</strong>
                  <span>
                    {new Intl.DateTimeFormat("zh-TW", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(snapshot.createdAt))}
                    {" · "}
                    {projectWordCount(snapshot.project).toLocaleString()} 字
                  </span>
                </div>
                <button
                  onClick={() => setComparisonId(snapshot.id)}
                  disabled={busy}
                  aria-pressed={comparisonId === snapshot.id}
                >
                  比較
                </button>
                <button
                  onClick={() => onRestore(snapshot)}
                  disabled={busy}
                >
                  還原
                </button>
              </article>
            ))
          )}
        </div>
        {comparison && <SnapshotComparison snapshot={comparison} project={project} onClose={() => setComparisonId(null)} />}
      </section>
    </div>
  );
}

function ModulePlaceholder({
  module,
  entityCount,
}: {
  module: (typeof moduleCopy)[Exclude<Section, "manuscript">];
  entityCount: number;
}) {
  return (
    <div className="module-placeholder">
      <div className="module-copy">
        <span className="eyebrow">{module.eyebrow}</span>
        <h1>{module.title}</h1>
        <p>{module.description}</p>
        <button>
          查看第一階段規劃
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="module-feature-grid">
        {module.items.map((item, index) => (
          <article key={item}>
            <span>0{index + 1}</span>
            <h3>{item}</h3>
            <p>{index === 0 && entityCount > 0 ? `示範專案已有 ${entityCount} 筆可用資料。` : "核心資料結構已預留。"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default App;
