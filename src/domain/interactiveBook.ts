import type { StoryProject } from "./models";
import { manuscriptScenes } from "./project";

export interface BookChoice { id: string; text: string; targetId: string }
export interface BookBlock {
  sceneId: string;
  number: number;
  mode: "choices" | "continue" | "ending";
  targetId: string;
  choices: BookChoice[];
}
export interface InteractiveBook {
  version: 1; enabled: boolean; nextNumber: number; startId: string; blocks: BookBlock[];
}
export const blockNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

export function validateInteractiveBook(value: unknown): InteractiveBook {
  const b = value as InteractiveBook;
  const invalid = () => { throw new Error("互動書籍資料格式不正確，請檢查劇情編號與選項。"); };
  if (!b || b.version !== 1 || typeof b.enabled !== "boolean" || !Number.isSafeInteger(b.nextNumber) || b.nextNumber < 1 || typeof b.startId !== "string" || !Array.isArray(b.blocks)) return invalid();
  const scenes = new Set<string>(), numbers = new Set<number>(), choices = new Set<string>();
  for (const block of b.blocks) {
    if (!block || typeof block.sceneId !== "string" || !block.sceneId || scenes.has(block.sceneId) || !Number.isSafeInteger(block.number) || block.number < 1 || block.number >= b.nextNumber || numbers.has(block.number) || !["choices", "continue", "ending"].includes(block.mode) || typeof block.targetId !== "string" || !Array.isArray(block.choices)) return invalid();
    scenes.add(block.sceneId); numbers.add(block.number);
    for (const c of block.choices) {
      if (!c || typeof c.id !== "string" || !c.id || choices.has(c.id) || typeof c.text !== "string" || typeof c.targetId !== "string") return invalid();
      choices.add(c.id);
    }
  }
  return structuredClone(b);
}

/** Keep deleted scene records as numbering tombstones. Never renumber after reorder. */
export function syncBook(project: StoryProject, book: InteractiveBook): InteractiveBook {
  const missing = manuscriptScenes(project).filter(n => !book.blocks.some(b => b.sceneId === n.id));
  if (!missing.length) return book;
  return { ...book, nextNumber: book.nextNumber + missing.length, blocks: [...book.blocks, ...missing.map((n, i): BookBlock => ({ sceneId: n.id, number: book.nextNumber + i, mode: "choices", targetId: "", choices: [] }))] };
}
export function initialBook(project: StoryProject): InteractiveBook {
  return syncBook(project, { version: 1, enabled: true, nextNumber: 1, startId: manuscriptScenes(project)[0]?.id ?? "", blocks: [] });
}
export function liveBlocks(project: StoryProject, book: InteractiveBook): BookBlock[] {
  return book.blocks.filter(b => project.nodes.some(n => n.id === b.sceneId && n.kind === "scene")).sort((a, b) => a.number - b.number);
}
export function blockLabel(project: StoryProject, block: BookBlock): string {
  return `${blockNumber(block.number)} ${project.nodes.find(n => n.id === block.sceneId)?.title ?? "已移除場景"}`;
}
export interface BookProblem { sceneId: string; message: string }
export function bookProblems(project: StoryProject, book: InteractiveBook): BookProblem[] {
  const blocks = liveBlocks(project, book), ids = new Set(blocks.map(b => b.sceneId));
  const problems: BookProblem[] = [];
  if (!ids.has(book.startId)) problems.push({ sceneId: "", message: "請選擇有效的起點。" });
  for (const b of blocks) {
    const add = (message: string) => problems.push({ sceneId: b.sceneId, message: `${blockNumber(b.number)}：${message}` });
    if (b.mode === "continue" && !ids.has(b.targetId)) add("直接繼續的目標不存在或尚未設定。");
    if (b.mode === "choices") {
      if (!b.choices.length) add("請新增選項，或改成直接繼續／結局。");
      for (const c of b.choices) {
        if (!c.text.trim()) add("有選項尚未填寫文字。");
        if (!ids.has(c.targetId)) add(`選項「${c.text || "未命名"}」缺少有效目標。`);
      }
    }
  }
  return problems;
}

export interface ReadBlock { sceneId: string; number: number; title: string; text: string; mode: BookBlock["mode"]; choices: BookChoice[] }
export interface BookSession { blocks: ReadBlock[]; path: string[]; source: string }
export function bookFingerprint(project: StoryProject, book: InteractiveBook): string {
  return JSON.stringify([book, liveBlocks(project, book).map(b => {
    const n = project.nodes.find(n => n.id === b.sceneId)!;
    return [n.id, n.title, project.documents[n.documentId ?? ""]?.plainText ?? ""];
  })]);
}
export function startBook(project: StoryProject, book: InteractiveBook): BookSession {
  if (!book.enabled) throw new Error("請先開啟互動分支模式。");
  if (bookProblems(project, book).length) throw new Error("請先修正分支設定，再開始試讀。");
  const blocks = liveBlocks(project, book).map((b): ReadBlock => {
    const node = project.nodes.find(n => n.id === b.sceneId)!;
    return { sceneId: b.sceneId, number: b.number, title: node.title, text: project.documents[node.documentId ?? ""]?.plainText ?? "", mode: b.mode, choices: b.mode === "ending" ? [] : b.mode === "continue" ? [{ id: `continue:${b.sceneId}`, text: "繼續閱讀", targetId: b.targetId }] : structuredClone(b.choices) };
  });
  return { blocks, path: [book.startId], source: bookFingerprint(project, book) };
}
export function chooseBook(session: BookSession, choiceId: string): BookSession {
  const current = session.blocks.find(b => b.sceneId === session.path.at(-1));
  const choice = current?.choices.find(c => c.id === choiceId);
  if (!choice || !session.blocks.some(b => b.sceneId === choice.targetId)) throw new Error("選項或目標不存在。");
  return { ...session, path: [...session.path, choice.targetId] };
}
export function backBook(session: BookSession): BookSession {
  return session.path.length > 1 ? { ...session, path: session.path.slice(0, -1) } : session;
}
