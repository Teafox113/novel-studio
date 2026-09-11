import type { InspirationKind } from "../domain/models";

export type QuickTextCapture =
  | { type: "web"; url: string; title: string }
  | { type: "inspiration"; content: string; title: string; kind: InspirationKind };

export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function titleForUrl(value: string): string {
  const url = new URL(value.trim());
  const path = decodeURIComponent(url.pathname)
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, " ");
  return path ? `${url.hostname} · ${path.slice(0, 48)}` : url.hostname;
}

export function inferInspirationKind(content: string): InspirationKind {
  const normalized = content.trim();
  if (/^[「『“\"]|[」』”\"]$/.test(normalized) || /說[：:]|對白|台詞/.test(normalized)) {
    return "dialogue";
  }
  if (/角色|人物|主角|反派|名字|性格/.test(normalized)) return "character";
  if (/世界觀|國家|城市|魔法|制度|宗教|歷史/.test(normalized)) return "world";
  if (/場景|鏡頭|開場|結尾|畫面/.test(normalized)) return "scene";
  if (/劇情|伏筆|轉折|衝突|真相/.test(normalized)) return "plot";
  return "note";
}

function titleForText(content: string): string {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "隨手靈感";
  return firstLine.length > 32 ? `${firstLine.slice(0, 32)}…` : firstLine;
}

export function classifyQuickText(value: string): QuickTextCapture | null {
  const content = value.trim();
  if (!content) return null;
  if (isWebUrl(content)) {
    return { type: "web", url: content, title: titleForUrl(content) };
  }
  return {
    type: "inspiration",
    content,
    title: titleForText(content),
    kind: inferInspirationKind(content),
  };
}
