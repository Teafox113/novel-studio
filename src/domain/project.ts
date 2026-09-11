import type { ProjectNode, StoryProject } from "./models";

export function countWords(text: string): number {
  const cjkCharacters =
    text.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    )?.length ?? 0;
  const withoutCjk = text.replace(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    " ",
  );
  const latinWords = withoutCjk.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return cjkCharacters + (latinWords?.length ?? 0);
}

export function childrenOf(
  nodes: ProjectNode[],
  parentId: string | null,
): ProjectNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function descendantsOf(
  nodes: ProjectNode[],
  parentId: string | null,
): ProjectNode[] {
  return childrenOf(nodes, parentId).flatMap((node) => [
    node,
    ...descendantsOf(nodes, node.id),
  ]);
}

export function manuscriptScenes(project: StoryProject): ProjectNode[] {
  return project.nodes
    .filter((node) => node.kind === "scene")
    .sort((a, b) => {
      const parentComparison = (a.parentId ?? "").localeCompare(b.parentId ?? "");
      return parentComparison || a.sortOrder - b.sortOrder;
    });
}

export function projectWordCount(project: StoryProject): number {
  return project.nodes.reduce((total, node) => total + node.wordCount, 0);
}

export function moveSibling(
  nodes: ProjectNode[],
  nodeId: string,
  direction: -1 | 1,
): ProjectNode[] {
  const current = nodes.find((node) => node.id === nodeId);
  if (!current) return nodes;

  const siblings = childrenOf(nodes, current.parentId);
  const index = siblings.findIndex((node) => node.id === nodeId);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= siblings.length) return nodes;

  const target = siblings[targetIndex];
  return nodes.map((node) => {
    if (node.id === current.id) return { ...node, sortOrder: target.sortOrder };
    if (node.id === target.id) return { ...node, sortOrder: current.sortOrder };
    return node;
  });
}
