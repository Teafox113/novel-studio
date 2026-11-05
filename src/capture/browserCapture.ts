import type { StoryProject } from "../domain/models";

export interface BrowserCapture {
  id: string;
  kind: "quote" | "note";
  title: string;
  text: string;
  url: string;
  note: string;
  createdAt: string;
}

export function parseBrowserCaptures(source: string): BrowserCapture[] {
  if (new TextEncoder().encode(source).length > 5 * 1024 * 1024) throw new Error("收集檔案超過 5 MB，請分批匯入。");
  let value;
  try { value = JSON.parse(source); } catch { throw new Error("無法讀取收集檔案，請使用收集助手匯出的 JSON。"); }
  if (value?.format !== "novel-studio-capture" || value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 200) {
    throw new Error("不是支援的 Novel Studio 收集檔案（版本 1，最多 200 筆）。");
  }
  const seen = new Set<string>();
  return value.entries.map((entry: unknown, index: number) => {
    const fail = () => { throw new Error(`第 ${index + 1} 筆資料不完整或格式不正確，尚未匯入任何內容。`); };
    if (!entry || typeof entry !== "object") return fail();
    const e = entry as Record<string, unknown>;
    for (const [key, max] of Object.entries({ id: 80, title: 200, text: 20000, url: 2048, note: 4000, createdAt: 40 })) {
      if (typeof e[key] !== "string" || (e[key] as string).length > max) return fail();
    }
    const item = e as unknown as BrowserCapture;
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(item.id) || seen.has(item.id) || !item.text.trim() || !item.title.trim() || !Number.isFinite(Date.parse(item.createdAt)) || !["quote", "note"].includes(item.kind)) return fail();
    if (item.url) {
      try { if (!["http:", "https:"].includes(new URL(item.url).protocol)) return fail(); } catch { return fail(); }
    } else if (item.kind === "quote") return fail();
    seen.add(item.id);
    return { id: item.id, kind: item.kind, title: item.title, text: item.text, url: item.url, note: item.note, createdAt: item.createdAt };
  });
}

export function hasBrowserCapture(project: StoryProject, id: string) {
  return project.researchItems.some(item => item.id === `capture-${id}`) || project.inspirations.some(item => item.id === `sticky-capture-${id}`);
}

export function importBrowserCaptures(project: StoryProject, entries: BrowserCapture[]): StoryProject {
  const now = new Date().toISOString();
  const researchItems = [...project.researchItems];
  const inspirations = [...project.inspirations];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id) || hasBrowserCapture(project, entry.id)) continue;
    seen.add(entry.id);
    if (entry.kind === "quote") {
      researchItems.push({ id: `capture-${entry.id}`, title: entry.title, kind: "web", status: "inbox", summary: entry.text, notes: entry.note, sourceUrl: entry.url,
        citation: { author: "", publisher: new URL(entry.url).hostname, publishedAt: "", accessedAt: new Date(entry.createdAt).toISOString().slice(0, 10) },
        originalFileName: "", mediaType: "text/plain", byteSize: 0, dataUrl: "", linkedNodeIds: [], linkedEntityIds: [], linkedInspirationIds: [], createdAt: entry.createdAt, updatedAt: now });
    } else {
      inspirations.push({ id: `sticky-capture-${entry.id}`, title: entry.title, content: [entry.text, entry.note, entry.url ? `來源：${entry.url}` : ""].filter(Boolean).join("\n\n"), kind: "note", status: "inbox", linkedNodeIds: [], linkedEntityIds: [], createdAt: entry.createdAt, updatedAt: now });
    }
  }
  return seen.size ? { ...project, researchItems, inspirations, updatedAt: now } : project;
}
