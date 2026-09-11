import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  Clock3,
  FileSearch,
  FileText,
  FolderOpen,
  Library,
  Lightbulb,
  Search,
  X,
} from "lucide-react";
import type { StoryProject } from "../domain/models";
import {
  buildProjectSearchIndex,
  parseSearchQuery,
  searchProjectIndex,
  type ProjectSearchResult,
  type SearchResultKind,
} from "../search/projectSearch";

interface ProjectSearchDialogProps {
  project: StoryProject;
  onClose: () => void;
  onOpenResult: (result: ProjectSearchResult) => void;
}

type KindFilter = SearchResultKind | "all";

const filters: Array<{ id: KindFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "scene", label: "場景" },
  { id: "entity", label: "世界觀" },
  { id: "timeline", label: "時間線" },
  { id: "research", label: "研究" },
  { id: "inspiration", label: "靈感" },
  { id: "document", label: "文件" },
];

const kindCopy: Record<
  SearchResultKind,
  { label: string; icon: typeof Search; className: string }
> = {
  scene: { label: "場景", icon: BookOpenText, className: "scene" },
  document: { label: "文件", icon: FolderOpen, className: "document" },
  entity: { label: "世界觀", icon: Library, className: "entity" },
  timeline: { label: "時間線", icon: Clock3, className: "timeline" },
  research: { label: "研究", icon: FileSearch, className: "research" },
  inspiration: { label: "靈感", icon: Lightbulb, className: "inspiration" },
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = parseSearchQuery(query).terms
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!text || terms.length === 0) return <>{text}</>;
  const expression = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "giu",
  );
  return (
    <>
      {text.split(expression).map((part, index) =>
        terms.some(
          (term) =>
            part.normalize("NFKC").toLocaleLowerCase("zh-TW") === term,
        ) ? (
          <mark key={`${part}-${index}`}>{part}</mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

export function ProjectSearchDialog({
  project,
  onClose,
  onOpenResult,
}: ProjectSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const searchIndex = useMemo(() => buildProjectSearchIndex(project), [project]);
  const results = useMemo(
    () => searchProjectIndex(searchIndex, query, kindFilter),
    [kindFilter, query, searchIndex],
  );
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [kindFilter, query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const openResult = (result: ProjectSearchResult) => {
    onOpenResult(result);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      openResult(results[activeIndex]);
    }
  };

  return (
    <div
      className="project-search-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="project-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="搜尋整個專案"
        onKeyDown={onKeyDown}
      >
        <header className="project-search-header">
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋正文、人物、地點、Tag、時間線與研究…"
            aria-label="搜尋關鍵字"
          />
          {query && (
            <button
              className="project-search-clear"
              onClick={() => setQuery("")}
              aria-label="清除搜尋"
            >
              <X size={16} />
            </button>
          )}
          <kbd>Esc</kbd>
        </header>

        <nav className="project-search-filters" aria-label="搜尋類型">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={kindFilter === filter.id ? "active" : ""}
              onClick={() => setKindFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        <div className="project-search-results" role="listbox">
          {parsedQuery.terms.length === 0 ? (
            <div className="project-search-welcome">
              <div className="search-welcome-icon">
                <FileText size={25} />
              </div>
              <h2>從整部作品找回任何線索</h2>
              <p>
                多個關鍵字會同時符合；可輸入 <code>#政治</code> 搜尋 Tag，或用
                <code> type:人物</code> 限定資料類型。
              </p>
              <div className="search-scope-summary">
                <span>{project.nodes.length} 份手稿</span>
                <span>{project.entities.length} 筆世界觀</span>
                <span>{project.timelineEvents.length} 個事件</span>
                <span>{project.researchItems.length} 份研究</span>
                <span>{project.inspirations.length} 則靈感</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="project-search-empty">
              <Search size={25} />
              <h2>沒有找到「{parsedQuery.terms.join(" ")}」</h2>
              <p>試著減少關鍵字、切換「全部」，或搜尋人物別名與 Tag。</p>
            </div>
          ) : (
            results.map((result, index) => {
              const copy = kindCopy[result.kind];
              const Icon = copy.icon;
              return (
                <button
                  key={result.key}
                  ref={index === activeIndex ? activeRef : undefined}
                  className={`project-search-result ${index === activeIndex ? "active" : ""}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openResult(result)}
                >
                  <span className={`search-kind-icon ${copy.className}`}>
                    <Icon size={17} />
                  </span>
                  <span className="search-result-content">
                    <span className="search-result-heading">
                      <strong>
                        <HighlightedText text={result.title} query={query} />
                      </strong>
                      <small>{result.subtitle}</small>
                    </span>
                    {result.excerpt && (
                      <span className="search-result-excerpt">
                        <HighlightedText text={result.excerpt} query={query} />
                      </span>
                    )}
                    <span className="search-result-meta">
                      <em>{copy.label}</em>
                      {result.matchedFields.slice(0, 4).map((field) => (
                        <i key={field}>符合：{field}</i>
                      ))}
                    </span>
                  </span>
                  <span className="search-open-hint">Enter ↵</span>
                </button>
              );
            })
          )}
        </div>

        <footer className="project-search-footer">
          <span>
            <kbd>↑</kbd><kbd>↓</kbd> 選擇
          </span>
          <span><kbd>Enter</kbd> 開啟</span>
          <span>完全在本機搜尋</span>
          {results.length > 0 && <strong>{results.length} 筆結果</strong>}
        </footer>
      </section>
    </div>
  );
}
