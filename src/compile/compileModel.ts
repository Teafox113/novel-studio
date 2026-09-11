import type { DraftStatus, ProjectNode, StoryProject } from "../domain/models";
import { childrenOf, countWords } from "../domain/project";

export type CompileFormat = "docx" | "epub" | "html" | "txt" | "pdf";
export type SceneBreakStyle = "space" | "asterism" | "page";

export interface CompileOptions {
  title: string;
  subtitle: string;
  author: string;
  language: string;
  includeTitlePage: boolean;
  includeVolumeTitles: boolean;
  includeSceneTitles: boolean;
  includeSynopsis: boolean;
  sceneBreakStyle: SceneBreakStyle;
  includedStatuses: DraftStatus[];
}

export interface CompiledScene {
  id: string;
  title: string;
  synopsis: string;
  status: DraftStatus;
  paragraphs: string[];
  wordCount: number;
}

export interface CompiledVolume {
  id: string;
  title: string;
  scenes: CompiledScene[];
}

export interface CompiledBook {
  projectId: string;
  title: string;
  subtitle: string;
  author: string;
  language: string;
  volumes: CompiledVolume[];
  sceneCount: number;
  wordCount: number;
  options: CompileOptions;
}

export function defaultCompileOptions(project: StoryProject): CompileOptions {
  return {
    title: project.title,
    subtitle: project.subtitle,
    author: project.author,
    language: "zh-TW",
    includeTitlePage: true,
    includeVolumeTitles: true,
    includeSceneTitles: true,
    includeSynopsis: false,
    sceneBreakStyle: "space",
    includedStatuses: ["構思", "草稿", "修訂", "完成"],
  };
}

function comparableTitle(value: string): string {
  return value
    .replace(/^\s*[\d０-９]+[\s　._、｜|-]*/, "")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("zh-TW");
}

function sceneParagraphs(project: StoryProject, node: ProjectNode): string[] {
  const plainText = node.documentId
    ? project.documents[node.documentId]?.plainText ?? ""
    : "";
  const paragraphs = plainText
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (
    paragraphs[0] &&
    comparableTitle(node.title).includes(comparableTitle(paragraphs[0]))
  ) {
    return paragraphs.slice(1);
  }
  return paragraphs;
}

function scenesBelow(
  project: StoryProject,
  parentId: string,
  options: CompileOptions,
): CompiledScene[] {
  const result: CompiledScene[] = [];
  for (const node of childrenOf(project.nodes, parentId)) {
    if (node.kind === "scene") {
      if (!options.includedStatuses.includes(node.status)) continue;
      const paragraphs = sceneParagraphs(project, node);
      result.push({
        id: node.id,
        title: node.title,
        synopsis: node.synopsis,
        status: node.status,
        paragraphs,
        wordCount: countWords(paragraphs.join("\n")),
      });
    } else {
      result.push(...scenesBelow(project, node.id, options));
    }
  }
  return result;
}

export function compileProject(
  project: StoryProject,
  options: CompileOptions,
): CompiledBook {
  const manuscriptRoot =
    project.nodes.find(
      (node) => node.kind === "folder" && node.parentId === null && node.id === "manuscript",
    ) ?? project.nodes.find((node) => node.kind === "folder" && node.parentId === null);
  const rootId = manuscriptRoot?.id ?? "";
  const volumes: CompiledVolume[] = [];

  if (rootId) {
    const directChildren = childrenOf(project.nodes, rootId);
    const directScenes = directChildren.filter((node) => node.kind === "scene");
    if (directScenes.length > 0) {
      volumes.push({
        id: `${rootId}-direct`,
        title: manuscriptRoot?.title ?? "正文",
        scenes: directScenes.flatMap((node) =>
          options.includedStatuses.includes(node.status)
            ? [
                {
                  id: node.id,
                  title: node.title,
                  synopsis: node.synopsis,
                  status: node.status,
                  paragraphs: sceneParagraphs(project, node),
                  wordCount: countWords(sceneParagraphs(project, node).join("\n")),
                },
              ]
            : [],
        ),
      });
    }
    for (const folder of directChildren.filter((node) => node.kind === "folder")) {
      const scenes = scenesBelow(project, folder.id, options);
      if (scenes.length > 0) volumes.push({ id: folder.id, title: folder.title, scenes });
    }
  } else {
    const scenes = project.nodes
      .filter((node) => node.kind === "scene" && options.includedStatuses.includes(node.status))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((node) => {
        const paragraphs = sceneParagraphs(project, node);
        return {
          id: node.id,
          title: node.title,
          synopsis: node.synopsis,
          status: node.status,
          paragraphs,
          wordCount: countWords(paragraphs.join("\n")),
        };
      });
    if (scenes.length > 0) volumes.push({ id: "manuscript", title: "正文", scenes });
  }

  const allScenes = volumes.flatMap((volume) => volume.scenes);
  return {
    projectId: project.id,
    title: options.title.trim() || project.title,
    subtitle: options.subtitle.trim(),
    author: options.author.trim(),
    language: options.language,
    volumes,
    sceneCount: allScenes.length,
    wordCount: allScenes.reduce((sum, scene) => sum + scene.wordCount, 0),
    options,
  };
}
