import { useEffect, useState } from "react";
import type { InspirationItem } from "../domain/models";

export function StickyNotes({ projectId, notes, saveState, onAdd, onPatch }: {
  projectId: string; notes: InspirationItem[]; saveState: string; onAdd: (note: InspirationItem) => void;
  onPatch: (id: string, patch: Partial<InspirationItem>) => void;
}) {
  const preferenceKey = `novel-studio:sticky:${projectId}`;
  const [preferences] = useState(() => { try { const value = JSON.parse(localStorage.getItem(preferenceKey) ?? "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; } });
  const [open, setOpen] = useState(preferences.open === true);
  const [collapsed, setCollapsed] = useState(preferences.collapsed === true);
  const [left, setLeft] = useState(preferences.left === true);
  const [selected, setSelected] = useState(typeof preferences.selected === "string" ? preferences.selected : "");
  const [trash, setTrash] = useState(false);
  useEffect(() => { try { localStorage.setItem(preferenceKey, JSON.stringify({ open, collapsed, left, selected })); } catch { /* Preferences must not block manuscript saving. */ } }, [preferenceKey, open, collapsed, left, selected]);
  const all = notes.filter(n => n.id.startsWith("sticky-") && n.kind === "note");
  const items = all.filter(n => trash ? n.status === "archived" : n.status !== "archived");
  const current = items.find(n => n.id === selected) ?? items[0];
  const add = () => {
    const now = new Date().toISOString();
    const note: InspirationItem = { id: `sticky-${crypto.randomUUID()}`, title: `便條 ${items.length + 1}`, content: "", kind: "note", status: "inbox", linkedNodeIds: [], linkedEntityIds: [], createdAt: now, updatedAt: now };
    onAdd(note); setSelected(note.id); setTrash(false); setCollapsed(false); setOpen(true);
  };
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyN") {
        e.preventDefault(); if (!open) { if (!current) add(); else { setOpen(true); setCollapsed(false); } } else setOpen(false);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });
  if (!open) return <button className="sticky-launch" title="便條紙 · Ctrl+Shift+N" onClick={() => { if (!current) add(); else { setOpen(true); setCollapsed(false); } }}>便條紙{all.filter(n => n.status !== "archived").length ? ` · ${all.filter(n => n.status !== "archived").length}` : ""}</button>;
  return <aside className={`sticky-notes ${left ? "sticky-left" : ""}`} aria-label="隨手便條紙">
    <header><strong>便條紙</strong><button onClick={() => setLeft(!left)} aria-label={left ? "移到右側" : "移到左側"}>{left ? "移右" : "移左"}</button><button onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>{collapsed ? "展開" : "收合"}</button><button onClick={() => setOpen(false)} aria-label="關閉便條紙">×</button></header>
    {!collapsed && <><div className="sticky-tools"><select aria-label="選擇便條紙" value={current?.id ?? ""} onChange={e => setSelected(e.target.value)}>{items.map(n => <option key={n.id} value={n.id}>{n.title || "未命名便條"}</option>)}</select><button onClick={add}>＋新增</button></div>
      <button onClick={() => { setTrash(!trash); setSelected(""); }}>{trash ? "返回便條" : `回收區 · ${all.filter(n => n.status === "archived").length}`}</button>
      {!current && <p>{trash ? "回收區是空的。" : "還沒有便條，按新增開始。"}</p>}
      {current && <><input readOnly={trash} aria-label="便條標題" value={current.title} placeholder="便條標題" onChange={e => onPatch(current.id, { title: e.target.value })} /><textarea readOnly={trash} aria-label="便條內容" autoFocus placeholder="先記下靈感，繼續寫故事…" value={current.content} onChange={e => onPatch(current.id, { content: e.target.value })} /><button onClick={() => { onPatch(current.id, { status: trash ? "inbox" : "archived" }); setSelected(""); }}>{trash ? "復原這張便條" : "移到回收區"}</button></>}
      <footer role="status"><span>{saveState === "saved" ? "已儲存於本作品" : saveState === "error" ? "儲存失敗，請檢查上方提示" : "儲存中…"}</span><small>關閉只隱藏便條。內容隨專案匯出與備份，也可在手稿靈感清單找到。Ctrl+Shift+N 開啟／關閉；回收區可復原。</small></footer>
    </>}
  </aside>;
}
