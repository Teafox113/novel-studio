import { useMemo, useState } from "react";
import {
  AlignLeft,
  BookCopy,
  BookOpen,
  Check,
  Code2,
  Download,
  FileText,
  Printer,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { DraftStatus, StoryProject } from "../domain/models";
import {
  compileProject,
  defaultCompileOptions,
  type CompileFormat,
  type CompileOptions,
} from "../compile/compileModel";
import {
  printCompiledBook,
  saveCompiledBook,
} from "../compile/compileExport";

const formatOptions: Array<{
  id: CompileFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { id: "docx", label: "Word DOCX", description: "交稿、編輯與校對", icon: FileText },
  { id: "epub", label: "EPUB 3", description: "電子書閱讀器", icon: BookOpen },
  { id: "pdf", label: "PDF", description: "列印與固定版面", icon: Printer },
  { id: "html", label: "HTML", description: "網頁與自訂排版", icon: Code2 },
  { id: "txt", label: "純文字", description: "長期保存與交換", icon: AlignLeft },
];

const statuses: DraftStatus[] = ["構思", "草稿", "修訂", "完成"];

export function CompileCenter({
  project,
  onNotice,
}: {
  project: StoryProject;
  onNotice: (message: string) => void;
}) {
  const [options, setOptions] = useState<CompileOptions>(() =>
    defaultCompileOptions(project),
  );
  const [format, setFormat] = useState<CompileFormat>("docx");
  const [busy, setBusy] = useState(false);
  const book = useMemo(() => compileProject(project, options), [project, options]);

  const patch = (next: Partial<CompileOptions>) =>
    setOptions((current) => ({ ...current, ...next }));

  const toggleStatus = (status: DraftStatus) => {
    const included = options.includedStatuses.includes(status);
    patch({
      includedStatuses: included
        ? options.includedStatuses.filter((item) => item !== status)
        : [...options.includedStatuses, status],
    });
  };

  const exportBook = async () => {
    if (book.sceneCount === 0) {
      window.alert("目前沒有符合條件的場景可供匯出。");
      return;
    }
    if (format === "pdf") {
      printCompiledBook();
      return;
    }
    setBusy(true);
    try {
      const saved = await saveCompiledBook(book, format);
      if (saved) onNotice(`${format.toUpperCase()} 已匯出`);
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "匯出失敗。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="compile-center">
      <aside className="compile-settings">
        <header>
          <span className="eyebrow">COMPILE</span>
          <h1>匯出中心</h1>
          <p>從同一份手稿產生投稿檔、電子書與保存版本。</p>
        </header>

        <div className="compile-settings-scroll">
          <section>
            <h2><BookCopy size={14} />書籍資料</h2>
            <label><span>書名</span><input value={options.title} onChange={(event) => patch({ title: event.target.value })} /></label>
            <label><span>副標題</span><input value={options.subtitle} onChange={(event) => patch({ subtitle: event.target.value })} /></label>
            <label><span>作者</span><input value={options.author} onChange={(event) => patch({ author: event.target.value })} /></label>
          </section>

          <section>
            <h2><Settings2 size={14} />書稿內容</h2>
            <CompileCheck checked={options.includeTitlePage} label="加入書名頁" onChange={(checked) => patch({ includeTitlePage: checked })} />
            <CompileCheck checked={options.includeVolumeTitles} label="顯示卷標題" onChange={(checked) => patch({ includeVolumeTitles: checked })} />
            <CompileCheck checked={options.includeSceneTitles} label="顯示場景標題" onChange={(checked) => patch({ includeSceneTitles: checked })} />
            <CompileCheck checked={options.includeSynopsis} label="包含場景摘要" onChange={(checked) => patch({ includeSynopsis: checked })} />
            <label className="compile-select"><span>場景分隔</span><select value={options.sceneBreakStyle} onChange={(event) => patch({ sceneBreakStyle: event.target.value as CompileOptions["sceneBreakStyle"] })}><option value="space">留白</option><option value="asterism">⁂ 分隔符</option><option value="page">另起新頁</option></select></label>
          </section>

          <section>
            <h2><Check size={14} />包含狀態</h2>
            <div className="compile-statuses">{statuses.map((status) => <button key={status} className={options.includedStatuses.includes(status) ? "active" : ""} onClick={() => toggleStatus(status)}><span>{options.includedStatuses.includes(status) && <Check size={11} />}</span>{status}</button>)}</div>
          </section>
        </div>
      </aside>

      <main className="compile-preview-pane">
        <div className="compile-preview-toolbar">
          <div><span className="eyebrow">LIVE PREVIEW</span><strong>書稿預覽</strong></div>
          <span>{book.sceneCount} 個場景 · {book.wordCount.toLocaleString()} 字</span>
        </div>
        <article className="compile-preview">
          {options.includeTitlePage && <section className="compile-title-page"><h1>{book.title}</h1>{book.subtitle && <p>{book.subtitle}</p>}{book.author && <strong>{book.author}</strong>}</section>}
          {book.volumes.map((volume) => <section className="compile-volume" key={volume.id}>{options.includeVolumeTitles && <h1>{volume.title}</h1>}{volume.scenes.map((scene, index) => <section className={`compile-scene break-${options.sceneBreakStyle}`} key={scene.id}>{options.includeSceneTitles && <h2>{scene.title}</h2>}{options.includeSynopsis && scene.synopsis && <aside>摘要｜{scene.synopsis}</aside>}{scene.paragraphs.map((paragraph, paragraphIndex) => <p key={`${scene.id}-${paragraphIndex}`}>{paragraph}</p>)}{options.sceneBreakStyle === "asterism" && index < volume.scenes.length - 1 && <div className="compile-scene-break">⁂</div>}</section>)}</section>)}
          {book.sceneCount === 0 && <div className="compile-empty"><FileText size={35} /><strong>沒有可預覽的場景</strong><span>請在左側至少選擇一種稿件狀態。</span></div>}
        </article>
      </main>

      <aside className="compile-output">
        <header><span className="eyebrow">OUTPUT</span><h2>輸出格式</h2></header>
        <div className="compile-format-list">{formatOptions.map(({ id, label, description, icon: Icon }) => <button key={id} className={format === id ? "active" : ""} onClick={() => setFormat(id)}><span><Icon size={17} /></span><span><strong>{label}</strong><small>{description}</small></span>{format === id && <Check size={14} />}</button>)}</div>
        <div className="compile-summary">
          <h3>本次書稿</h3>
          <div><span>卷數</span><strong>{book.volumes.length}</strong></div>
          <div><span>場景</span><strong>{book.sceneCount}</strong></div>
          <div><span>字數</span><strong>{book.wordCount.toLocaleString()}</strong></div>
          <div><span>預估頁數</span><strong>約 {Math.max(1, Math.ceil(book.wordCount / 500))} 頁</strong></div>
        </div>
        <div className="compile-pdf-note"><Sparkles size={14} /><p>{format === "pdf" ? "PDF 會開啟系統列印視窗，請選擇「另存為 PDF」。系統字型能正確保存繁體中文。" : "輸出檔不會修改正文；改變左側選項只影響這次匯出。"}</p></div>
        <button className="compile-export" onClick={exportBook} disabled={busy || book.sceneCount === 0}>{format === "pdf" ? <Printer size={15} /> : <Download size={15} />}{busy ? "產生中…" : format === "pdf" ? "列印／另存 PDF" : `匯出 ${format.toUpperCase()}`}</button>
      </aside>
    </div>
  );
}

function CompileCheck({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="compile-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><Check size={11} /></span>{label}</label>;
}
