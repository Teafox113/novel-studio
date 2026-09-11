import { useMemo, useState } from "react";
import {
  ChevronDown,
  FileText,
  FolderOpen,
  Lightbulb,
  MessageSquareQuote,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { childrenOf } from "../domain/project";
import type {
  InspirationItem,
  ProjectNode,
  StoryTag,
  TagLink,
} from "../domain/models";

interface BinderProps {
  nodes: ProjectNode[];
  selectedId: string;
  inspirations: InspirationItem[];
  tags: StoryTag[];
  tagLinks: TagLink[];
  selectedInspirationId: string | null;
  onSelect: (id: string) => void;
  onAddScene: () => void;
  onSelectInspiration: (id: string) => void;
  onAddInspiration: () => void;
}

function TreeBranch({
  nodes,
  parentId,
  selectedId,
  onSelect,
  depth = 0,
}: Pick<BinderProps, "nodes" | "selectedId" | "onSelect"> & {
  parentId: string | null;
  depth?: number;
}) {
  return (
    <>
      {childrenOf(nodes, parentId).map((node) => {
        const children = childrenOf(nodes, node.id);
        const isFolder = node.kind === "folder";
        return (
          <div key={node.id}>
            <button
              className={`binder-row ${selectedId === node.id ? "selected" : ""}`}
              style={{ paddingLeft: `${14 + depth * 16}px` }}
              onClick={() => onSelect(node.id)}
            >
              {isFolder ? (
                <>
                  <ChevronDown size={13} className="binder-chevron" />
                  <FolderOpen size={15} />
                </>
              ) : (
                <>
                  <span className="binder-spacer" />
                  <FileText size={14} />
                </>
              )}
              <span className="binder-title">{node.title}</span>
              {node.kind === "scene" && (
                <span className={`status-dot status-${node.status}`} />
              )}
            </button>
            {children.length > 0 && (
              <TreeBranch
                nodes={nodes}
                parentId={node.id}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function Binder({
  nodes,
  selectedId,
  inspirations,
  tags,
  tagLinks,
  selectedInspirationId,
  onSelect,
  onAddScene,
  onSelectInspiration,
  onAddInspiration,
}: BinderProps) {
  const [ideaQuery, setIdeaQuery] = useState("");
  const tagNamesByInspiration = useMemo(() => {
    const tagById = new Map(tags.map((tag) => [tag.id, tag.name]));
    const result = new Map<string, string[]>();
    for (const link of tagLinks) {
      if (link.targetType !== "inspiration") continue;
      const name = tagById.get(link.tagId);
      if (!name) continue;
      result.set(link.targetId, [...(result.get(link.targetId) ?? []), name]);
    }
    return result;
  }, [tagLinks, tags]);
  const visibleInspirations = useMemo(() => {
    const query = ideaQuery.trim().toLocaleLowerCase("zh-TW");
    return inspirations
      .filter((item) => item.status !== "archived")
      .filter(
        (item) =>
          !query ||
          item.title.toLocaleLowerCase("zh-TW").includes(query) ||
          item.content.toLocaleLowerCase("zh-TW").includes(query) ||
          (tagNamesByInspiration.get(item.id) ?? []).some((tag) =>
            tag.toLocaleLowerCase("zh-TW").includes(query),
          ),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [ideaQuery, inspirations, tagNamesByInspiration]);

  return (
    <aside className="binder">
      <section className="binder-manuscript">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">MANUSCRIPT</span>
            <h2>手稿</h2>
          </div>
          <button
            className="icon-button quiet"
            title="新增場景"
            onClick={onAddScene}
          >
            <Plus size={17} />
          </button>
        </div>
        <div className="binder-tree">
          <TreeBranch
            nodes={nodes}
            parentId={null}
            selectedId={selectedInspirationId ? "" : selectedId}
            onSelect={onSelect}
          />
        </div>
      </section>

      <section className="inspiration-shelf">
        <div className="inspiration-heading">
          <div>
            <span className="eyebrow">IDEA INBOX</span>
            <h3>
              <Lightbulb size={15} />
              隨手靈感庫
            </h3>
          </div>
          <button
            className="icon-button quiet"
            title="新增靈感"
            onClick={onAddInspiration}
          >
            <Plus size={16} />
          </button>
        </div>
        <label className="idea-search">
          <Search size={13} />
          <input
            value={ideaQuery}
            placeholder="搜尋未定構思…"
            onChange={(event) => setIdeaQuery(event.target.value)}
          />
        </label>
        <div className="idea-list">
          {visibleInspirations.length === 0 ? (
            <button className="idea-empty" onClick={onAddInspiration}>
              <Sparkles size={16} />
              記下第一個靈感
            </button>
          ) : (
            visibleInspirations.map((item) => (
              <button
                key={item.id}
                className={`idea-row ${selectedInspirationId === item.id ? "selected" : ""} ${item.status === "used" ? "used" : ""}`}
                onClick={() => onSelectInspiration(item.id)}
              >
                {item.kind === "dialogue" ? (
                  <MessageSquareQuote size={14} />
                ) : (
                  <Lightbulb size={14} />
                )}
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.status === "used"
                      ? "已採用"
                      : (tagNamesByInspiration.get(item.id)?.[0] ??
                        kindLabel[item.kind])}
                  </small>
                </span>
              </button>
            ))
          )}
        </div>
      </section>
      <div className="binder-footer">
        <span>{nodes.filter((node) => node.kind === "scene").length} 個場景</span>
        <span>{inspirations.filter((item) => item.status !== "archived").length} 則靈感</span>
      </div>
    </aside>
  );
}

const kindLabel: Record<InspirationItem["kind"], string> = {
  plot: "劇情構思",
  scene: "場景草稿",
  dialogue: "對白",
  character: "人物",
  world: "世界觀",
  note: "隨手筆記",
};
