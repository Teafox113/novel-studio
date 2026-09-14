import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { version } from "../../package.json";

export function VersionInfo() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="version-info" ref={root}>
    <button ref={trigger} className="version-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="version-panel">FloofyFox · v{version}</button>
    {open && <section id="version-panel" className="version-panel" aria-label="版本資訊">
      <button className="version-close" aria-label="關閉版本資訊" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} /></button>
      <span className="eyebrow">ABOUT NOVEL STUDIO</span><h2>Novel Studio <small>v{version}</small></h2>
      <p>FloofyFox · 2026-09-14 · Windows x64</p>
      <a href="https://github.com/Teafox113/novel-studio" target="_blank" rel="noreferrer">GitHub 專案與問題回報 ↗</a>
      <h3>本版本功能</h3><p>場景寫作、卡片與大綱、世界觀、雙軸時間線、研究素材、全文搜尋、本機審核與書稿匯出。</p>
      <h3>v{version} 更新內容</h3><ul>
        <li>介面字型與小說正文字型獨立選擇，四種字型風格。</li>
        <li>介面縮放 100%～175%，正文維持自己的 15～36px 字級。</li>
        <li>寫作區與打字機模式新增正文字級選單。</li>
        <li>放大手稿清單、世界觀卡片與側欄輔助文字。</li>
      </ul>
      <h3>近期版本</h3><p>0.12.0 · 架空歷史與自訂曆法<br />0.11.0 · 多小說專案管理與免安裝版<br />0.10.0 · 打字機模式、版本比較與版本資訊</p>
      <h3>資料與使用說明</h3><p>Windows 使用本機 SQLite；瀏覽器使用 localStorage。請定期匯出 .novel 備份。本機審核不傳送稿件至模型服務；開啟外部來源會連線到該網站。</p>
      <h3>技術與授權</h3><p>React · TypeScript · Tiptap · Tauri 2 · SQLite。第三方套件遵循各自授權；本專案尚未指定開源授權。</p>
      <a href="https://github.com/Teafox113/novel-studio/releases" target="_blank" rel="noreferrer">版本下載與更新紀錄 ↗</a>
    </section>}
  </div>;
}
