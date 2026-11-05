export function createEntry(input) {
  if (!input || !["quote", "note"].includes(input.kind)) throw new Error("不支援的素材類型。");
  const text = typeof input.text === "string" ? input.text : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const url = typeof input.url === "string" ? input.url : "";
  if (!text.trim() || text.length > 20000 || note.length > 4000 || url.length > 2048) throw new Error("內容不可為空；文字最多 20,000 字、備註 4,000 字、網址 2,048 字。");
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error("來源網址無效。"); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("只支援一般 HTTP／HTTPS 網頁。");
  } else if (input.kind === "quote") throw new Error("摘錄需要網頁來源。");
  return { id: crypto.randomUUID(), kind: input.kind, title: (typeof input.title === "string" ? input.title.trim() : "").slice(0, 200) || text.slice(0, 50), text, note, url, createdAt: new Date().toISOString() };
}

export function appendEntry(entries, entry) {
  const next = [...entries, entry];
  if (next.length > 200 || new TextEncoder().encode(JSON.stringify(next)).length > 4 * 1024 * 1024) throw new Error("收集匣已滿（200 筆或 4 MB）。請先匯出並確認匯入成功，再刪除舊素材。");
  return next;
}

export function exportCollection(entries) {
  return JSON.stringify({ format: "novel-studio-capture", version: 1, entries }, null, 2);
}
