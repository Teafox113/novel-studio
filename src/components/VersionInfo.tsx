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
    <button ref={trigger} className="version-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="version-panel">FloofyFox · Novel Studio v{version}</button>
    {open && <section id="version-panel" className="version-panel" aria-label="版本資訊">
      <button className="version-close" aria-label="關閉版本資訊" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} /></button>
      <span className="eyebrow">ABOUT NOVEL STUDIO</span><h2>Novel Studio <small>v{version}</small></h2>
      <h3>創作者</h3><p><img src="/creator-avatar.png" width="48" height="48" alt="FloofyFox 創作者頭像" style={{ borderRadius: 12, verticalAlign: "middle", marginRight: 12 }} /><a href="https://github.com/Teafox113" target="_blank" rel="noreferrer">FloofyFox ↗</a></p>
      <h3>工具與版本</h3><p>2026-10-28 · Windows x64 安裝版／免安裝版<br />套件：novel-studio · 主程式：novel-studio.exe<br />Copyright (c) 2026 FloofyFox</p>
      <a href="https://github.com/Teafox113/novel-studio" target="_blank" rel="noreferrer">GitHub 專案與問題回報 ↗</a>
      <h3>本版本功能</h3><p>場景寫作、卡片與大綱、世界觀、雙軸時間線、研究素材、全文搜尋、本機審核與書稿匯出。</p>
      <h3>本版變更內容</h3><ul><li>資料夾備份歷史、差異預覽與還原前安全快照。</li><li>儲存與還原順序保護，以及未儲存／備份未完成的離開提示。</li><li>便條紙回收區與復原、位置記憶、Ctrl+Shift+N 快捷鍵。</li></ul>
      <h3>近期版本</h3><p>0.16.0 · 反白關鍵詞與變數庫<br />0.15.0 · 編號劇情塊與可回退試讀<br />0.14.0 · 遊戲式人物狀態卡<br />0.13.0 · 獨立介面字型與正文字級</p>
      <h3>隱私與資料處理</h3><p>Windows 使用本機 SQLite；瀏覽器使用 localStorage。請定期匯出 .novel 備份。啟用資料夾備份後會寫入指定位置，雲端資料夾的共享權限可能讓他人讀取作品。本機審核不傳送稿件至模型服務；開啟外部來源會連線到該網站。</p>
      <h3>使用開源函式庫</h3><p>React · TypeScript · Tiptap · Tauri 2 · SQLite。第三方套件遵循各自授權；本專案尚未指定開源授權。</p>
      <p><a href="https://github.com/Teafox113/novel-studio/blob/main/THIRD_PARTY_LICENSES.md" target="_blank" rel="noreferrer">第三方版本、來源與授權全文 ↗</a></p>
      <h3>已知限制</h3><p>人物卡尚未自動與試讀狀態同步。安裝檔尚未簽署數位簽章；免安裝版仍將資料存於使用者目錄。雲端上傳由 Google Drive 電腦版處理；尚無直接 Google 登入與雙向合併。</p>
      <a href="https://github.com/Teafox113/novel-studio/releases" target="_blank" rel="noreferrer">版本下載與更新紀錄 ↗</a>
    </section>}
  </div>;
}
