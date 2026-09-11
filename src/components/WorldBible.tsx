import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Building2,
  Check,
  CirclePlus,
  Gem,
  Languages,
  Lightbulb,
  FileSearch,
  Link2,
  MapPin,
  Plus,
  Search,
  ScrollText,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  EntityRelation,
  EntityType,
  StoryEntity,
  StoryProject,
} from "../domain/models";
import {
  backlinksForEntity,
  filterWorldEntities,
  relationsForEntity,
  type EntityTypeFilter,
} from "../domain/world";

const entityTypes: Array<{
  id: EntityType;
  label: string;
  singular: string;
  color: string;
  icon: typeof UserRound;
}> = [
  { id: "character", label: "人物", singular: "人物", color: "#d88d68", icon: UserRound },
  { id: "location", label: "地點", singular: "地點", color: "#65a291", icon: MapPin },
  { id: "faction", label: "勢力", singular: "勢力", color: "#7b88b8", icon: Building2 },
  { id: "item", label: "物品", singular: "物品", color: "#b39457", icon: Gem },
  { id: "lore", label: "設定", singular: "設定", color: "#9175aa", icon: ScrollText },
  { id: "term", label: "專有名詞", singular: "名詞", color: "#718b9a", icon: Languages },
];

const typeMeta = Object.fromEntries(
  entityTypes.map((type) => [type.id, type]),
) as Record<EntityType, (typeof entityTypes)[number]>;

interface WorldBibleProps {
  project: StoryProject;
  focusedEntityId?: string | null;
  onCreateEntity: (type: EntityType) => string;
  onPatchEntity: (entityId: string, patch: Partial<StoryEntity>) => void;
  onTagsChange: (entityId: string, names: string[]) => void;
  onCreateRelation: (
    fromEntityId: string,
    toEntityId: string,
    label: string,
    notes: string,
  ) => void;
  onRemoveRelation: (relationId: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenInspiration: (inspirationId: string) => void;
  onOpenResearch: (researchId: string) => void;
}

export function WorldBible({
  project,
  focusedEntityId,
  onCreateEntity,
  onPatchEntity,
  onTagsChange,
  onCreateRelation,
  onRemoveRelation,
  onOpenScene,
  onOpenInspiration,
  onOpenResearch,
}: WorldBibleProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EntityTypeFilter>("all");
  const [selectedId, setSelectedId] = useState(project.entities[0]?.id ?? "");
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationLabel, setRelationLabel] = useState("");
  const [relationNotes, setRelationNotes] = useState("");

  const filteredEntities = useMemo(
    () => filterWorldEntities(project.entities, query, filter),
    [project.entities, query, filter],
  );
  const selected = project.entities.find((entity) => entity.id === selectedId);

  useEffect(() => {
    if (!selected && project.entities[0]) setSelectedId(project.entities[0].id);
  }, [project.entities, selected]);

  useEffect(() => {
    if (focusedEntityId && project.entities.some((entity) => entity.id === focusedEntityId)) {
      setSelectedId(focusedEntityId);
    }
  }, [focusedEntityId, project.entities]);

  const relations = useMemo(
    () =>
      selected
        ? relationsForEntity(project.entityRelations, selected.id)
        : [],
    [project.entityRelations, selected],
  );
  const backlinks = useMemo(
    () => (selected ? backlinksForEntity(project, selected.id) : null),
    [project, selected],
  );
  const tagNames = useMemo(() => {
    if (!selected) return [];
    const tagIds = new Set(
      project.tagLinks
        .filter(
          (link) =>
            link.targetType === "entity" && link.targetId === selected.id,
        )
        .map((link) => link.tagId),
    );
    return project.tags
      .filter((tag) => tagIds.has(tag.id))
      .map((tag) => tag.name);
  }, [project.tagLinks, project.tags, selected]);
  const linkedScenes =
    backlinks?.sceneIds
      .map((id) => project.nodes.find((node) => node.id === id))
      .filter((node) => node !== undefined) ?? [];
  const linkedInspirations =
    backlinks?.inspirationIds
      .map((id) => project.inspirations.find((item) => item.id === id))
      .filter((item) => item !== undefined) ?? [];
  const linkedResearch =
    backlinks?.researchIds
      .map((id) => project.researchItems.find((item) => item.id === id))
      .filter((item) => item !== undefined) ?? [];

  const createEntity = (type: EntityType) => {
    const id = onCreateEntity(type);
    setFilter(type);
    setQuery("");
    setSelectedId(id);
  };

  const addAttribute = () => {
    if (!selected) return;
    let index = 1;
    let key = "新屬性";
    while (key in selected.attributes) key = `新屬性 ${++index}`;
    onPatchEntity(selected.id, {
      attributes: { ...selected.attributes, [key]: "" },
    });
  };

  const renameAttribute = (oldKey: string, newKey: string) => {
    if (!selected || !newKey.trim() || newKey === oldKey) return;
    const next = Object.fromEntries(
      Object.entries(selected.attributes).map(([key, value]) => [
        key === oldKey ? newKey.trim() : key,
        value,
      ]),
    );
    onPatchEntity(selected.id, { attributes: next });
  };

  const submitRelation = () => {
    if (!selected || !relationTargetId || !relationLabel.trim()) return;
    onCreateRelation(
      selected.id,
      relationTargetId,
      relationLabel.trim(),
      relationNotes.trim(),
    );
    setRelationTargetId("");
    setRelationLabel("");
    setRelationNotes("");
  };

  return (
    <div className="world-bible">
      <aside className="world-library">
        <header>
          <div>
            <span className="eyebrow">WORLD BIBLE</span>
            <h1>世界觀資料庫</h1>
          </div>
          <div className="world-add-menu">
            <button title="新增資料" aria-label="新增資料">
              <Plus size={17} />
            </button>
            <div>
              {entityTypes.map(({ id, singular, icon: Icon }) => (
                <button key={id} onClick={() => createEntity(id)}>
                  <Icon size={14} />新增{singular}
                </button>
              ))}
            </div>
          </div>
        </header>

        <label className="world-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋名稱、別名、屬性…"
          />
        </label>

        <div className="world-type-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            全部 <span>{project.entities.length}</span>
          </button>
          {entityTypes.map(({ id, label }) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {label}
              <span>{project.entities.filter((entity) => entity.type === id).length}</span>
            </button>
          ))}
        </div>

        <div className="world-entity-list">
          {filteredEntities.length === 0 ? (
            <div className="world-empty-list">
              <Search size={23} />
              <span>沒有符合的資料</span>
            </div>
          ) : (
            filteredEntities.map((entity) => {
              const meta = typeMeta[entity.type];
              const Icon = meta.icon;
              return (
                <button
                  key={entity.id}
                  className={selectedId === entity.id ? "active" : ""}
                  onClick={() => setSelectedId(entity.id)}
                >
                  <span
                    className="entity-symbol"
                    style={{ background: entity.color || meta.color }}
                  >
                    <Icon size={15} />
                  </span>
                  <span>
                    <strong>{entity.name || `未命名${meta.singular}`}</strong>
                    <small>{meta.label} · {entity.summary || "尚未撰寫摘要"}</small>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {selected ? (
        <main className="world-editor">
          <header className="world-editor-header">
            <div
              className="world-hero-icon"
              style={{ background: selected.color || typeMeta[selected.type].color }}
            >
              {(() => {
                const Icon = typeMeta[selected.type].icon;
                return <Icon size={22} />;
              })()}
            </div>
            <div>
              <span>{typeMeta[selected.type].label}</span>
              <input
                value={selected.name}
                aria-label="名稱"
                onChange={(event) =>
                  onPatchEntity(selected.id, { name: event.target.value })
                }
              />
            </div>
            <span className="world-saved-hint"><Check size={12} />自動儲存</span>
          </header>

          <div className="world-editor-scroll">
            <section className="world-form-section">
              <h2>基本資料</h2>
              <div className="world-fields two-columns">
                <label>
                  <span>類型</span>
                  <select
                    value={selected.type}
                    onChange={(event) =>
                      onPatchEntity(selected.id, {
                        type: event.target.value as EntityType,
                      })
                    }
                  >
                    {entityTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>識別色</span>
                  <span className="world-color-field">
                    <input
                      type="color"
                      value={selected.color || typeMeta[selected.type].color}
                      onChange={(event) =>
                        onPatchEntity(selected.id, { color: event.target.value })
                      }
                    />
                    {selected.color || typeMeta[selected.type].color}
                  </span>
                </label>
              </div>
              <label className="world-full-field">
                <span>別名與稱號</span>
                <input
                  value={selected.aliases.join("、")}
                  placeholder="例如：阿晝、渡鴉店主"
                  onChange={(event) =>
                    onPatchEntity(selected.id, {
                      aliases: event.target.value
                        .split(/[、,，]/)
                        .map((name) => name.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="world-full-field">
                <span>摘要</span>
                <textarea
                  value={selected.summary}
                  placeholder="用幾句話說明這個元素，以及它在故事中的作用…"
                  onChange={(event) =>
                    onPatchEntity(selected.id, { summary: event.target.value })
                  }
                />
              </label>
              <label className="world-full-field">
                <span>標籤</span>
                <div className="world-tag-input">
                  <Tag size={14} />
                  <input
                    key={`${selected.id}-${tagNames.join("|")}`}
                    defaultValue={tagNames.join("、")}
                    placeholder="主角、皇室、火系魔法…"
                    onBlur={(event) =>
                      onTagsChange(
                        selected.id,
                        event.target.value
                          .split(/[、,，]/)
                          .map((name) => name.trim())
                          .filter(Boolean),
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </div>
              </label>
            </section>

            <section className="world-form-section">
              <div className="world-section-heading">
                <div>
                  <h2>自訂屬性</h2>
                  <p>依資料類型自由加入年齡、職業、能力、所屬或年代。</p>
                </div>
                <button onClick={addAttribute}><CirclePlus size={14} />加入屬性</button>
              </div>
              <div className="world-attributes">
                {Object.entries(selected.attributes).length === 0 ? (
                  <div className="world-inline-empty">尚未建立屬性。</div>
                ) : (
                  Object.entries(selected.attributes).map(([key, value]) => (
                    <div key={key}>
                      <input
                        defaultValue={key}
                        aria-label="屬性名稱"
                        onBlur={(event) => renameAttribute(key, event.target.value)}
                      />
                      <input
                        value={value}
                        aria-label={`${key}的值`}
                        placeholder="輸入內容"
                        onChange={(event) =>
                          onPatchEntity(selected.id, {
                            attributes: {
                              ...selected.attributes,
                              [key]: event.target.value,
                            },
                          })
                        }
                      />
                      <button
                        aria-label={`移除${key}`}
                        onClick={() => {
                          const next = { ...selected.attributes };
                          delete next[key];
                          onPatchEntity(selected.id, { attributes: next });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="world-form-section">
              <div className="world-section-heading">
                <div>
                  <h2>關係</h2>
                  <p>建立人物、地點、勢力與設定之間可供搜尋和校對的連結。</p>
                </div>
              </div>
              <div className="relation-create">
                <select
                  value={relationTargetId}
                  onChange={(event) => setRelationTargetId(event.target.value)}
                >
                  <option value="">選擇關聯對象</option>
                  {project.entities
                    .filter((entity) => entity.id !== selected.id)
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}（{typeMeta[entity.type].label}）
                      </option>
                    ))}
                </select>
                <input
                  value={relationLabel}
                  onChange={(event) => setRelationLabel(event.target.value)}
                  placeholder="關係，例如：居住於、敵對、持有"
                />
                <input
                  value={relationNotes}
                  onChange={(event) => setRelationNotes(event.target.value)}
                  placeholder="補充說明（選填）"
                />
                <button
                  onClick={submitRelation}
                  disabled={!relationTargetId || !relationLabel.trim()}
                >
                  <Link2 size={14} />建立
                </button>
              </div>
              <div className="relation-list">
                {relations.length === 0 ? (
                  <div className="world-inline-empty">尚未建立關係。</div>
                ) : (
                  relations.map((relation) => (
                    <RelationRow
                      key={relation.id}
                      relation={relation}
                      selectedId={selected.id}
                      entities={project.entities}
                      onSelect={setSelectedId}
                      onRemove={onRemoveRelation}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      ) : (
        <main className="world-editor world-no-selection">
          <ScrollText size={38} />
          <h2>建立第一筆世界觀資料</h2>
          <p>從左上角的＋選擇人物、地點或其他類型。</p>
        </main>
      )}

      <aside className="world-context">
        <header>
          <span className="eyebrow">BACKLINKS</span>
          <h2>出現與來源</h2>
          <p>確認這項設定在哪些場景與靈感中被使用。</p>
        </header>

        <section>
          <h3><BookOpenText size={14} />相關場景 <span>{linkedScenes.length}</span></h3>
          {linkedScenes.length === 0 ? (
            <div className="context-empty">尚未連結場景</div>
          ) : (
            linkedScenes.map((scene) => (
              <button key={scene.id} onClick={() => onOpenScene(scene.id)}>
                <span>{scene.title}</span>
                <small>{scene.synopsis || "尚無場景摘要"}</small>
                <ArrowRight size={13} />
              </button>
            ))
          )}
        </section>

        <section>
          <h3><FileSearch size={14} />研究來源 <span>{linkedResearch.length}</span></h3>
          {linkedResearch.length === 0 ? (
            <div className="context-empty">尚未連結研究素材</div>
          ) : (
            linkedResearch.map((item) => (
              <button key={item.id} onClick={() => onOpenResearch(item.id)}>
                <span>{item.title}</span>
                <small>{item.summary || item.originalFileName || "尚無摘要"}</small>
                <ArrowRight size={13} />
              </button>
            ))
          )}
        </section>

        <section>
          <h3><Lightbulb size={14} />靈感來源 <span>{linkedInspirations.length}</span></h3>
          {linkedInspirations.length === 0 ? (
            <div className="context-empty">尚未連結靈感</div>
          ) : (
            linkedInspirations.map((item) => (
              <button key={item.id} onClick={() => onOpenInspiration(item.id)}>
                <span>{item.title}</span>
                <small>{item.content || "尚無內容"}</small>
                <ArrowRight size={13} />
              </button>
            ))
          )}
        </section>

        <div className="world-context-note">
          <Link2 size={15} />
          <p><strong>資料會隨故事成長</strong>場景與靈感中的連結會自動回到這裡，後續可直接交給 AI 做一致性校對。</p>
        </div>
      </aside>
    </div>
  );
}

function RelationRow({
  relation,
  selectedId,
  entities,
  onSelect,
  onRemove,
}: {
  relation: EntityRelation;
  selectedId: string;
  entities: StoryEntity[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const outgoing = relation.fromEntityId === selectedId;
  const counterpartId = outgoing ? relation.toEntityId : relation.fromEntityId;
  const counterpart = entities.find((entity) => entity.id === counterpartId);

  return (
    <article>
      <button className="relation-main" onClick={() => onSelect(counterpartId)}>
        <span className={outgoing ? "relation-direction outgoing" : "relation-direction incoming"}>
          {outgoing ? "→" : "←"}
        </span>
        <span>
          <strong>{outgoing ? relation.label : `${relation.label}（反向）`}</strong>
          <small>{counterpart?.name ?? "找不到關聯資料"}{relation.notes ? ` · ${relation.notes}` : ""}</small>
        </span>
      </button>
      <button
        className="relation-remove"
        aria-label="移除關係"
        onClick={() => onRemove(relation.id)}
      >
        <Trash2 size={13} />
      </button>
    </article>
  );
}
