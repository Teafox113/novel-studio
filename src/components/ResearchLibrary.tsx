import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  BookOpenText,
  Download,
  ExternalLink,
  File,
  FileText,
  Globe2,
  Image,
  Link2,
  Lightbulb,
  NotebookPen,
  Paperclip,
  Plus,
  Search,
  Tag,
  Trash2,
  Unlink,
  Upload,
  Users,
} from "lucide-react";
import type {
  ResearchItem,
  ResearchKind,
  ResearchStatus,
  StoryProject,
} from "../domain/models";

const kinds: Array<{ id: ResearchKind; label: string; icon: typeof File }> = [
  { id: "note", label: "筆記", icon: NotebookPen },
  { id: "web", label: "網頁", icon: Globe2 },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "image", label: "圖片", icon: Image },
  { id: "document", label: "文件", icon: File },
];

const statusLabels: Record<ResearchStatus, string> = {
  inbox: "待整理",
  reviewed: "已查閱",
  cited: "已引用",
  archived: "已封存",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "沒有附件";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface ResearchLibraryProps {
  project: StoryProject;
  focusedItemId: string | null;
  onCreateItem: (kind: Extract<ResearchKind, "note" | "web">) => string;
  onImportFile: () => Promise<string | null>;
  onPatchItem: (itemId: string, patch: Partial<ResearchItem>) => void;
  onTagsChange: (itemId: string, names: string[]) => void;
  onRemoveItem: (itemId: string) => void;
  onSaveAttachment: (item: ResearchItem) => Promise<void>;
  onOpenScene: (sceneId: string) => void;
  onOpenInspiration: (inspirationId: string) => void;
  onQuickCapture: () => void;
}

export function ResearchLibrary({
  project,
  focusedItemId,
  onCreateItem,
  onImportFile,
  onPatchItem,
  onTagsChange,
  onRemoveItem,
  onSaveAttachment,
  onOpenScene,
  onOpenInspiration,
  onQuickCapture,
}: ResearchLibraryProps) {
  const [filter, setFilter] = useState<ResearchKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(project.researchItems[0]?.id ?? "");
  const [nodeToLink, setNodeToLink] = useState("");
  const [entityToLink, setEntityToLink] = useState("");
  const [inspirationToLink, setInspirationToLink] = useState("");
  const [importing, setImporting] = useState(false);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-TW");
    return project.researchItems.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!normalized) return true;
      return [
        item.title,
        item.summary,
        item.notes,
        item.sourceUrl,
        item.citation.author,
        item.citation.publisher,
        item.originalFileName,
      ]
        .join(" ")
        .toLocaleLowerCase("zh-TW")
        .includes(normalized);
    });
  }, [filter, project.researchItems, query]);
  const selected = project.researchItems.find((item) => item.id === selectedId);
  const scenes = project.nodes.filter((node) => node.kind === "scene");
  const tagNames = useMemo(() => {
    if (!selected) return [];
    const ids = new Set(
      project.tagLinks
        .filter((link) => link.targetType === "research" && link.targetId === selected.id)
        .map((link) => link.tagId),
    );
    return project.tags.filter((tag) => ids.has(tag.id)).map((tag) => tag.name);
  }, [project.tagLinks, project.tags, selected]);

  useEffect(() => {
    if (!selected && project.researchItems[0]) setSelectedId(project.researchItems[0].id);
  }, [project.researchItems, selected]);

  useEffect(() => {
    if (
      focusedItemId &&
      project.researchItems.some((item) => item.id === focusedItemId)
    ) {
      setSelectedId(focusedItemId);
    }
  }, [focusedItemId, project.researchItems]);

  const create = (kind: "note" | "web") => {
    const id = onCreateItem(kind);
    setSelectedId(id);
    setFilter(kind);
    setQuery("");
  };

  const importFile = async () => {
    setImporting(true);
    try {
      const id = await onImportFile();
      if (id) {
        setSelectedId(id);
        setFilter("all");
        setQuery("");
      }
    } finally {
      setImporting(false);
    }
  };

  const linkNode = () => {
    if (!selected || !nodeToLink || selected.linkedNodeIds.includes(nodeToLink)) return;
    onPatchItem(selected.id, { linkedNodeIds: [...selected.linkedNodeIds, nodeToLink] });
    setNodeToLink("");
  };
  const linkEntity = () => {
    if (!selected || !entityToLink || selected.linkedEntityIds.includes(entityToLink)) return;
    onPatchItem(selected.id, { linkedEntityIds: [...selected.linkedEntityIds, entityToLink] });
    setEntityToLink("");
  };
  const linkInspiration = () => {
    if (!selected || !inspirationToLink || selected.linkedInspirationIds.includes(inspirationToLink)) return;
    onPatchItem(selected.id, { linkedInspirationIds: [...selected.linkedInspirationIds, inspirationToLink] });
    setInspirationToLink("");
  };

  return (
    <div className="research-library">
      <aside className="research-sidebar">
        <header>
          <div><span className="eyebrow">RESEARCH</span><h1>研究與素材</h1></div>
          <div className="research-new-menu">
            <button aria-label="新增研究素材"><Plus size={16} /></button>
            <div>
              <button onClick={() => create("note")}><NotebookPen size={14} />新增筆記</button>
              <button onClick={() => create("web")}><Globe2 size={14} />新增網址</button>
              <button onClick={importFile} disabled={importing}><Upload size={14} />{importing ? "匯入中…" : "匯入檔案"}</button>
            </div>
          </div>
        </header>
        <label className="research-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋標題、來源、筆記…" /></label>
        <button className="research-quick-capture-button" onClick={onQuickCapture}><Paperclip size={14} /><span><strong>直接貼上或拖入</strong><small>自動辨識網址、圖片與文件</small></span></button>
        <div className="research-filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部 <span>{project.researchItems.length}</span></button>
          {kinds.map(({ id, label }) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}<span>{project.researchItems.filter((item) => item.kind === id).length}</span></button>)}
        </div>
        <div className="research-list">
          {visible.length === 0 ? <div className="research-empty"><Search size={24} /><span>沒有符合的素材</span></div> : visible.map((item) => {
            const meta = kinds.find((kind) => kind.id === item.kind) ?? kinds[4];
            const Icon = meta.icon;
            return <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span className={`research-kind-icon ${item.kind}`}><Icon size={15} /></span><span><strong>{item.title || "未命名素材"}</strong><small>{statusLabels[item.status]} · {item.summary || item.originalFileName || "尚未撰寫摘要"}</small></span></button>;
          })}
        </div>
      </aside>

      {selected ? <main className="research-editor">
        <header className="research-editor-header">
          <div><span>{kinds.find((kind) => kind.id === selected.kind)?.label}</span><input value={selected.title} onChange={(event) => onPatchItem(selected.id, { title: event.target.value })} aria-label="素材名稱" /></div>
          <div className="research-header-actions">
            {selected.dataUrl && <button onClick={() => onSaveAttachment(selected)}><Download size={14} />另存附件</button>}
            <button className="research-delete" aria-label="刪除素材" onClick={() => onRemoveItem(selected.id)}><Trash2 size={15} /></button>
          </div>
        </header>
        <div className="research-editor-scroll">
          <ResearchPreview item={selected} />
          <section className="research-form-section">
            <div className="research-two-fields">
              <label><span>種類</span><select value={selected.kind} onChange={(event) => onPatchItem(selected.id, { kind: event.target.value as ResearchKind })}>{kinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
              <label><span>整理狀態</span><select value={selected.status} onChange={(event) => onPatchItem(selected.id, { status: event.target.value as ResearchStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <label className="research-field"><span>內容摘要</span><textarea value={selected.summary} onChange={(event) => onPatchItem(selected.id, { summary: event.target.value })} placeholder="這份資料能幫助哪段劇情或設定？" /></label>
            <label className="research-field"><span>摘錄與筆記</span><textarea className="research-notes" value={selected.notes} onChange={(event) => onPatchItem(selected.id, { notes: event.target.value })} placeholder="記錄重點、原文摘錄、待查問題或使用方式…" /></label>
            <label className="research-field"><span>來源網址</span><div className="research-url-field"><input value={selected.sourceUrl} onChange={(event) => onPatchItem(selected.id, { sourceUrl: event.target.value })} placeholder="https://…" />{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" aria-label="開啟來源"><ExternalLink size={14} /></a>}</div></label>
            <label className="research-field"><span>標籤</span><div className="research-tag-field"><Tag size={14} /><input key={`${selected.id}-${tagNames.join("|")}`} defaultValue={tagNames.join("、")} placeholder="歷史、服飾、航海、待查證…" onBlur={(event) => onTagsChange(selected.id, event.target.value.split(/[、,，]/).map((name) => name.trim()).filter(Boolean))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div></label>
          </section>

          <section className="research-form-section"><h2>來源註記</h2><div className="research-two-fields"><label><span>作者／機構</span><input value={selected.citation.author} onChange={(event) => onPatchItem(selected.id, { citation: { ...selected.citation, author: event.target.value } })} /></label><label><span>出版者／網站</span><input value={selected.citation.publisher} onChange={(event) => onPatchItem(selected.id, { citation: { ...selected.citation, publisher: event.target.value } })} /></label><label><span>出版日期</span><input value={selected.citation.publishedAt} onChange={(event) => onPatchItem(selected.id, { citation: { ...selected.citation, publishedAt: event.target.value } })} placeholder="可使用虛構或模糊日期" /></label><label><span>查閱日期</span><input type="date" value={selected.citation.accessedAt} onChange={(event) => onPatchItem(selected.id, { citation: { ...selected.citation, accessedAt: event.target.value } })} /></label></div></section>

          <ResearchLinkSection title="引用場景" icon={<BookOpenText size={14} />} value={nodeToLink} onValue={setNodeToLink} onAdd={linkNode} options={scenes.filter((scene) => !selected.linkedNodeIds.includes(scene.id)).map((scene) => ({ id: scene.id, label: scene.title }))}>{selected.linkedNodeIds.map((id) => { const scene = scenes.find((item) => item.id === id); return scene ? <div className="research-linked-row" key={id}><button onClick={() => onOpenScene(id)}><BookOpenText size={13} /><span>{scene.title}</span><ArrowRight size={12} /></button><button onClick={() => onPatchItem(selected.id, { linkedNodeIds: selected.linkedNodeIds.filter((item) => item !== id) })} aria-label="移除場景連結"><Unlink size={12} /></button></div> : null; })}</ResearchLinkSection>

          <ResearchLinkSection title="相關世界觀" icon={<Users size={14} />} value={entityToLink} onValue={setEntityToLink} onAdd={linkEntity} options={project.entities.filter((entity) => !selected.linkedEntityIds.includes(entity.id)).map((entity) => ({ id: entity.id, label: entity.name }))}>{selected.linkedEntityIds.map((id) => { const entity = project.entities.find((item) => item.id === id); return entity ? <div className="research-linked-entity" key={id}><i style={{ background: entity.color }} /><strong>{entity.name}</strong><button onClick={() => onPatchItem(selected.id, { linkedEntityIds: selected.linkedEntityIds.filter((item) => item !== id) })} aria-label="移除世界觀連結"><Unlink size={12} /></button></div> : null; })}</ResearchLinkSection>

          <ResearchLinkSection title="相關靈感" icon={<Lightbulb size={14} />} value={inspirationToLink} onValue={setInspirationToLink} onAdd={linkInspiration} options={project.inspirations.filter((item) => !selected.linkedInspirationIds.includes(item.id)).map((item) => ({ id: item.id, label: item.title }))}>{selected.linkedInspirationIds.map((id) => { const inspiration = project.inspirations.find((item) => item.id === id); return inspiration ? <div className="research-linked-row" key={id}><button onClick={() => onOpenInspiration(id)}><Lightbulb size={13} /><span>{inspiration.title}</span><ArrowRight size={12} /></button><button onClick={() => onPatchItem(selected.id, { linkedInspirationIds: selected.linkedInspirationIds.filter((item) => item !== id) })} aria-label="移除靈感連結"><Unlink size={12} /></button></div> : null; })}</ResearchLinkSection>
        </div>
      </main> : <main className="research-editor research-no-selection"><Paperclip size={36} /><h2>建立第一份研究素材</h2><p>新增筆記、網址，或匯入 PDF、圖片與文件。</p></main>}

      <aside className="research-context">
        <header><span className="eyebrow">SOURCE HEALTH</span><h2>素材狀態</h2></header>
        {selected ? <>
          <div className="research-health-card"><span className={`research-kind-icon ${selected.kind}`}>{(() => { const Icon = kinds.find((kind) => kind.id === selected.kind)?.icon ?? File; return <Icon size={18} />; })()}</span><div><strong>{selected.originalFileName || (selected.kind === "web" ? "網頁來源" : "專案內筆記")}</strong><small>{formatBytes(selected.byteSize)}{selected.mediaType ? ` · ${selected.mediaType}` : ""}</small></div></div>
          <section><h3>連結統計</h3><div className="research-stat"><BookOpenText size={14} /><span>引用場景</span><strong>{selected.linkedNodeIds.length}</strong></div><div className="research-stat"><Users size={14} /><span>世界觀項目</span><strong>{selected.linkedEntityIds.length}</strong></div><div className="research-stat"><Tag size={14} /><span>標籤</span><strong>{tagNames.length}</strong></div></section>
          <div className="research-portable-note"><Archive size={15} /><p><strong>附件隨專案保存</strong>匯入的檔案會包含在 `.novel` 中，搬到另一台電腦時不依賴原始路徑。</p></div>
        </> : <div className="research-empty">尚未選擇素材</div>}
      </aside>
    </div>
  );
}

function ResearchPreview({ item }: { item: ResearchItem }) {
  if (item.kind === "image" && item.dataUrl) return <section className="research-preview image-preview"><img src={item.dataUrl} alt={item.title} /></section>;
  if (item.kind === "pdf" && item.dataUrl) return <section className="research-preview pdf-preview"><object data={item.dataUrl} type="application/pdf"><FileText size={34} /><strong>{item.originalFileName}</strong><span>目前環境無法內嵌顯示，仍可使用「另存附件」。</span></object></section>;
  if (item.kind === "web") return <section className="research-preview web-preview"><Globe2 size={28} /><div><span>WEB SOURCE</span><strong>{item.sourceUrl || "尚未輸入來源網址"}</strong></div>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />開啟來源</a>}</section>;
  if (item.kind === "document" && item.dataUrl) return <section className="research-preview file-preview"><File size={30} /><div><strong>{item.originalFileName}</strong><span>{formatBytes(item.byteSize)} · 已嵌入專案</span></div></section>;
  return <section className="research-preview note-preview"><NotebookPen size={28} /><div><span>PROJECT NOTE</span><strong>專案內研究筆記</strong></div></section>;
}

function ResearchLinkSection({ title, icon, value, onValue, onAdd, options, children }: { title: string; icon: ReactNode; value: string; onValue: (value: string) => void; onAdd: () => void; options: Array<{ id: string; label: string }>; children: ReactNode }) {
  return <section className="research-form-section research-link-section"><h2>{icon}{title}</h2><div className="research-link-picker"><select value={value} onChange={(event) => onValue(event.target.value)}><option value="">選擇要連結的項目</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button onClick={onAdd} disabled={!value}><Link2 size={13} />加入</button></div><div className="research-linked-list">{children}</div></section>;
}
