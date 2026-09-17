import { useEffect, useRef, useState } from "react";
import { Backpack, HeartPulse, Lightbulb, Shield, Sparkles, UserRound, Plus, X } from "lucide-react";
import type { StoryEntity, StoryProject } from "../domain/models";
import { characterCategories, validateCharacterSheet, type CharacterKeyword, type CharacterCategory } from "../domain/characterSheet";

const icons = { identity: UserRound, condition: HeartPulse, item: Backpack, knowledge: Lightbulb, ability: Sparkles, stat: Shield };
export function CharacterSheet({ entity, project, onChange, onOpenEntity, onOpenScene }: {
  entity: StoryEntity; project: StoryProject; onChange: (sheet: NonNullable<StoryEntity["characterSheet"]>) => void;
  onOpenEntity: (id: string) => void; onOpenScene: (id: string) => void;
}) {
  const entries = entity.characterSheet?.entries ?? [];
  const detail = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<CharacterKeyword | null>(null);
  useEffect(() => { if (draft) detail.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [draft?.id]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<CharacterKeyword | null>(null);
  const nameOf = (e: CharacterKeyword) => project.entities.find(x => x.id === e.entityId)?.name || e.name;
  const start = (category: CharacterCategory) => { setError(""); setDraft({ id: crypto.randomUUID(), category, name: "", value: category === "item" ? 1 : 0, notes: "", entityId: "", sourceSceneId: "" }); };
  const save = () => {
    if (!draft) return;
    try {
      const next = { ...draft, name: draft.name.trim() };
      if (entries.some(e => e.id !== next.id && e.category === next.category && (next.entityId ? e.entityId === next.entityId : nameOf(e) === next.name))) throw new Error("此分類已有相同關鍵字，請編輯既有項目。");
      onChange(validateCharacterSheet({ version: 1, entries: [...entries.filter(e => e.id !== next.id), next] }));
      setDraft(null); setError("");
    } catch (err) { setError((err as Error).message); }
  };
  return <section className="character-sheet" aria-label="人物狀態卡">
    <header className="character-hero"><div className="character-avatar" style={{ background: entity.color }}>{entity.name.slice(0, 1) || "人"}</div><div><span className="eyebrow">CHARACTER PROFILE</span><h2>{entity.name}的人物狀態卡</h2><p>作者設定 · {entries.length} 個關鍵字</p></div></header>
    <p className="character-help">整理角色的起始設定與情節構想。此處由你手動管理，尚未依分支路線自動計算。</p>
    <input className="character-search" aria-label="搜尋人物關鍵字" placeholder="搜尋物品、資訊、狀態…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="character-grid">{(Object.entries(characterCategories) as [CharacterCategory, string][]).map(([category, label]) => {
      const Icon = icons[category]; const visible = entries.filter(e => e.category === category && `${nameOf(e)} ${e.notes}`.includes(query.trim()));
      return <section key={category} className={`character-group ${category}`}><header><h3><Icon size={18} />{label}</h3><button aria-label={`新增${label}關鍵字`} onClick={() => start(category)}><Plus size={17} /></button></header>
        <div className="character-keywords">{visible.map(e => <button className="character-keyword" key={e.id} onClick={() => { setDraft({ ...e, name: nameOf(e) }); setError(""); }}>
          <strong>{nameOf(e)}</strong>{(category === "item" || category === "stat" || category === "ability") && <span>{category === "item" ? "×" : ""}{e.value}{e.maximum ? ` / ${e.maximum}` : ""}</span>}
          {e.maximum && <progress value={e.value} max={e.maximum} aria-label={`${nameOf(e)}目前數值`} />}
          {e.entityId && !project.entities.some(x => x.id === e.entityId) && <small>連結資料已移除</small>}
        </button>)}</div>{!visible.length && <p className="character-empty">{query ? "沒有符合的關鍵字" : `按＋加入${label}`}</p>}
      </section>;
    })}</div>
    {removed && <div className="character-undo" role="status">已移除 {removed.name}<button onClick={() => { onChange({ version: 1, entries: [...entries, removed] }); setRemoved(null); }}>復原移除</button></div>}
    {draft && <section ref={detail} className="character-detail" aria-label="關鍵字詳細設定">
      <header><h3>{characterCategories[draft.category]} · 關鍵字設定</h3><button aria-label="取消關鍵字編輯" onClick={() => setDraft(null)}><X size={18} /></button></header>
      <label>關鍵字名稱<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} disabled={Boolean(draft.entityId && project.entities.some(x => x.id === draft.entityId))} /></label>
      <label>連結世界觀資料<select value={draft.entityId} onChange={e => { const linked = project.entities.find(x => x.id === e.target.value); setDraft({ ...draft, entityId: e.target.value, name: linked?.name ?? draft.name }); }}><option value="">獨立關鍵字</option>{draft.entityId && !project.entities.some(x => x.id === draft.entityId) && <option value={draft.entityId}>已移除的資料（可重新選擇）</option>}{project.entities.filter(x => x.id !== entity.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      {(draft.category === "item" || draft.category === "stat" || draft.category === "ability") && <div className="character-numbers"><label>{draft.category === "item" ? "數量" : "目前設定值"}<input type="number" step={draft.category === "item" ? 1 : "any"} value={Number.isNaN(draft.value) ? "" : draft.value} onChange={e => setDraft({ ...draft, value: e.target.valueAsNumber })} /></label>{draft.category !== "item" && <label>上限（選填）<input type="number" min="0.01" step="any" value={draft.maximum ?? ""} onChange={e => setDraft({ ...draft, maximum: e.target.value === "" ? undefined : e.target.valueAsNumber })} /></label>}</div>}
      <label>來源場景<select value={draft.sourceSceneId} onChange={e => setDraft({ ...draft, sourceSceneId: e.target.value })}><option value="">未指定／初始設定</option>{draft.sourceSceneId && !project.nodes.some(n => n.id === draft.sourceSceneId) && <option value={draft.sourceSceneId}>來源場景已移除</option>}{project.nodes.filter(n => n.kind === "scene").map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
      <label>補充說明<textarea value={draft.notes} placeholder="取得原因、效果、解除條件或尚未決定的構想…" onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
      {error && <p role="alert">{error}</p>}
      <footer><button className="character-save" onClick={save}>儲存關鍵字</button><button onClick={() => setDraft(null)}>取消</button>{entries.some(e => e.id === draft.id) && <button onClick={() => { setRemoved(entries.find(e => e.id === draft.id)!); onChange({ version: 1, entries: entries.filter(e => e.id !== draft.id) }); setDraft(null); }}>移除</button>}</footer>
      <div className="character-links">{draft.entityId && project.entities.some(e => e.id === draft.entityId) && <button onClick={() => onOpenEntity(draft.entityId)}>查看世界觀資料 ↗</button>}{draft.sourceSceneId && project.nodes.some(n => n.id === draft.sourceSceneId) && <button onClick={() => onOpenScene(draft.sourceSceneId)}>查看來源場景 ↗</button>}<small>離開前請先儲存此關鍵字。</small></div>
    </section>}
  </section>;
}
