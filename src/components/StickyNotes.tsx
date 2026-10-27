import { useState } from "react";
import type { InspirationItem } from "../domain/models";

export function StickyNotes({ notes, saveState, onAdd, onPatch }: {
  notes: InspirationItem[]; saveState: string; onAdd: (note: InspirationItem) => void;
  onPatch: (id: string, patch: Partial<InspirationItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [left, setLeft] = useState(false);
  const [selected, setSelected] = useState("");
  const items = notes.filter(n => n.id.startsWith("sticky-") && n.kind === "note");
  const current = items.find(n => n.id === selected) ?? items[0];
  const add = () => {
    const now = new Date().toISOString();
    const note: InspirationItem = { id: `sticky-${crypto.randomUUID()}`, title: `便條 ${items.length + 1}`, content: "", kind: "note", status: "inbox", linkedNodeIds: [], linkedEntityIds: [], createdAt: now, updatedAt: now };
    onAdd(note); setSelected(note.id); setCollapsed(false); setOpen(true);
  };
  if (!open) return <button className="sticky-launch" onClick={() => { if (!current) add(); else { setOpen(true); setCollapsed(false); } }}>便條紙{items.length ? ` · ${items.length}` : ""}</button>;
  return <aside className={`sticky-notes ${left ? "sticky-left" : ""}`} aria-label="隨手便條紙">
    <header><strong>便條紙</strong><button onClick={() => setLeft(!left)} aria-label={left ? "移到右側" : "移到左側"}>{left ? "移右" : "移左"}</button><button onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>{collapsed ? "展開" : "收合"}</button><button onClick={() => setOpen(false)} aria-label="關閉便條紙">×</button></header>
    {!collapsed && <><div className="sticky-tools"><select aria-label="選擇便條紙" value={current?.id ?? ""} onChange={e => setSelected(e.target.value)}>{items.map(n => <option key={n.id} value={n.id}>{n.title || "未命名便條"}</option>)}</select><button onClick={add}>＋新增</button></div>
      {current && <><input aria-label="便條標題" value={current.title} placeholder="便條標題" onChange={e => onPatch(current.id, { title: e.target.value })} /><textarea aria-label="便條內容" autoFocus placeholder="先記下靈感，繼續寫故事…" value={current.content} onChange={e => onPatch(current.id, { content: e.target.value })} /></>}
      <footer role="status"><span>{saveState === "saved" ? "已儲存於本作品" : saveState === "error" ? "儲存失敗，請檢查上方提示" : "儲存中…"}</span><small>關閉只隱藏便條。內容隨專案匯出與備份，也可在手稿靈感清單找到。</small></footer>
    </>}
  </aside>;
}
