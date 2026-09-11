import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  ExternalLink,
  File,
  FileSearch,
  FileText,
  Globe2,
  Image,
  Maximize2,
  NotebookPen,
  PanelRightClose,
  Pin,
  PinOff,
  Search,
} from "lucide-react";
import type { ResearchItem, StoryProject } from "../domain/models";

interface ResearchQuickPanelProps {
  floating?: boolean;
  project: StoryProject;
  currentSceneId: string | null;
  width: number;
  pinned: boolean;
  onWidthChange: (width: number) => void;
  onPinnedChange: (pinned: boolean) => void;
  onPatchItem: (itemId: string, patch: Partial<ResearchItem>) => void;
  onOpenFull: (itemId: string) => void;
  onClose: () => void;
}

const kindIcons = {
  note: NotebookPen,
  web: Globe2,
  pdf: FileText,
  image: Image,
  document: File,
} as const;

export function ResearchQuickPanel({
  floating = false,
  project,
  currentSceneId,
  width,
  pinned,
  onWidthChange,
  onPinnedChange,
  onPatchItem,
  onOpenFull,
  onClose,
}: ResearchQuickPanelProps) {
  const [corner, setCorner] = useState("top-right");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(project.researchItems[0]?.id ?? "");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-TW");
    return project.researchItems.filter((item) =>
      !normalized
        ? item.status !== "archived"
        : [item.title, item.summary, item.notes, item.sourceUrl, item.originalFileName]
            .join(" ")
            .toLocaleLowerCase("zh-TW")
            .includes(normalized),
    );
  }, [project.researchItems, query]);
  const selected = project.researchItems.find((item) => item.id === selectedId);
  const linkedToScene = Boolean(
    selected && currentSceneId && selected.linkedNodeIds.includes(currentSceneId),
  );

  useEffect(() => {
    if (!selected && visible[0]) setSelectedId(visible[0].id);
  }, [selected, visible]);

  const beginResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = (moveEvent: PointerEvent) => {
      onWidthChange(Math.max(320, Math.min(720, startWidth + startX - moveEvent.clientX)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  return (
    <aside className={`research-quick-panel ${floating ? `floating-reference ${corner} ${collapsed ? "collapsed" : ""}` : ""}`} style={{ width }} aria-label="研究參考浮窗">
      <button
        className="research-panel-resizer"
        onPointerDown={beginResize}
        aria-label="調整研究浮窗寬度"
      />
      <header className="research-quick-header">
        <div>
          <span>RESEARCH PEEK</span>
          <strong>研究浮窗</strong>
        </div>
        <button
          className={pinned ? "active" : ""}
          onClick={() => onPinnedChange(!pinned)}
          title={pinned ? "取消釘選" : "釘選浮窗"}
        >
          {pinned ? <Pin size={15} /> : <PinOff size={15} />}
        </button>
        <button onClick={onClose} title="關閉研究浮窗"><PanelRightClose size={16} /></button>
      </header>

      {floating && <div className="reference-controls">
        <select aria-label="參考浮窗位置" value={corner} onChange={event => setCorner(event.target.value)}>
          <option value="top-right">右上角</option><option value="bottom-right">右下角</option>
          <option value="top-left">左上角</option><option value="bottom-left">左下角</option>
        </select>
        <button onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed}>{collapsed ? "展開參考" : "收合參考"}</button>
      </div>}

      <label className="research-quick-search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋素材…" />
      </label>

      <div className="research-quick-list">
        {visible.length === 0 ? (
          <div className="research-quick-empty"><FileSearch size={21} />沒有符合的素材</div>
        ) : visible.map((item) => {
          const Icon = kindIcons[item.kind];
          return (
            <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <span className={`research-kind-icon ${item.kind}`}><Icon size={14} /></span>
              <span><strong>{item.title}</strong><small>{item.summary || item.originalFileName || item.sourceUrl || "尚未整理"}</small></span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="research-quick-preview">
          <ResearchQuickPreview item={selected} />
          <div className="research-quick-copy">
            <span>{selected.kind === "web" ? "網頁來源" : selected.originalFileName || "研究筆記"}</span>
            <h2>{selected.title}</h2>
            {selected.summary && <p>{selected.summary}</p>}
            {selected.notes && <blockquote>{selected.notes}</blockquote>}
          </div>
          <div className="research-quick-actions">
            <button
              disabled={!currentSceneId || linkedToScene}
              onClick={() => {
                if (!currentSceneId || linkedToScene) return;
                onPatchItem(selected.id, {
                  linkedNodeIds: [...selected.linkedNodeIds, currentSceneId],
                });
              }}
            >
              {linkedToScene ? <Check size={14} /> : <BookOpenText size={14} />}
              {linkedToScene ? "已連結目前場景" : "連結目前場景"}
            </button>
            <button onClick={() => onOpenFull(selected.id)}><Maximize2 size={14} />完整素材庫</button>
            {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />來源</a>}
          </div>
        </div>
      ) : (
        <div className="research-quick-empty"><FileSearch size={24} />尚未建立研究素材</div>
      )}
    </aside>
  );
}

function ResearchQuickPreview({ item }: { item: ResearchItem }) {
  if (item.kind === "image" && item.dataUrl) {
    return <div className="research-quick-media image"><img src={item.dataUrl} alt={item.title} /></div>;
  }
  if (item.kind === "pdf" && item.dataUrl) {
    return <div className="research-quick-media pdf"><object data={item.dataUrl} type="application/pdf"><FileText size={30} /><span>PDF 預覽無法載入</span></object></div>;
  }
  if (item.kind === "web") {
    return <div className="research-quick-media web"><Globe2 size={25} /><span>{item.sourceUrl || "網頁來源"}</span></div>;
  }
  const Icon = kindIcons[item.kind];
  return <div className="research-quick-media file"><Icon size={25} /><span>{item.originalFileName || "專案研究筆記"}</span></div>;
}
