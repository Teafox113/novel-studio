import { useEffect, useRef, useState } from "react";
import type { StoryProject } from "../domain/models";
import { hasBrowserCapture, parseBrowserCaptures, type BrowserCapture } from "../capture/browserCapture";

export function BrowserCaptureImport({ project, onClose, onImport }: { project: StoryProject; onClose: () => void; onImport: (entries: BrowserCapture[]) => void }) {
  const [entries, setEntries] = useState<BrowserCapture[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const available = entries.filter(item => !hasBrowserCapture(project, item.id));
  const chosen = available.filter(item => selected.has(item.id));
  return <dialog ref={dialog} className="browser-capture-import" onCancel={onClose}>
    <header><div><h2>匯入瀏覽器素材</h2><p>摘錄放進研究素材；隨手筆記變成便條紙。保留現有作品。</p></div><button onClick={onClose} aria-label="關閉匯入">×</button></header>
    <button disabled={loading} onClick={() => fileInput.current?.click()}>{loading ? "讀取中…" : "選擇收集助手匯出的 JSON"}</button>
    <input ref={fileInput} type="file" accept=".json,.novelclip" hidden onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      setLoading(true); setEntries([]); setError(""); setFilename("");
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("檔案超過 5 MB，請分批匯入。");
        const next = parseBrowserCaptures(await file.text());
        setEntries(next); setSelected(new Set(next.map(item => item.id))); setFilename(file.name);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "讀取失敗"); }
      finally { setLoading(false); }
    }} />
    {error && <p role="alert">{error}</p>}
    {!filename && !error && <p className="capture-empty">先在 Chrome 收集助手按「匯出」，再回到這裡選擇檔案。內容只在本機處理。</p>}
    {filename && <><p role="status">{filename} · {entries.length} 筆，{entries.length - available.length} 筆已匯入{entries.length === 0 ? "（檔案內沒有素材）" : ""}</p>
      <div className="capture-selection"><button onClick={() => setSelected(new Set(available.map(item => item.id)))}>全選新素材</button><button onClick={() => setSelected(new Set())}>取消全選</button></div>
      <div className="capture-preview">{entries.map(item => {
        const exists = hasBrowserCapture(project, item.id);
        return <label className="capture-preview-item" key={item.id}><input type="checkbox" disabled={exists} checked={!exists && selected.has(item.id)} onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /><div><small>{exists ? "已匯入 · 保留原有內容" : item.kind === "quote" ? "研究素材" : "便條紙"}</small><strong>{item.title}</strong><p>{item.text}</p>{item.note && <p>我的備註：{item.note}</p>}{item.url && <span className="capture-source">{item.url}</span>}</div></label>;
      })}</div></>}
    <footer><span>重複素材會略過，不會覆蓋已編輯的內容。</span><button disabled={!chosen.length || loading} onClick={() => { onImport(chosen); onClose(); }}>匯入 {chosen.length} 筆</button></footer>
  </dialog>;
}
