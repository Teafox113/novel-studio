import { useState } from "react";
import type { StoryProject } from "../domain/models";
import { sourceText, validateWritingVariables, variableKinds, type WritingVariable } from "../domain/writingVariables";
export function VariableLibrary({ project, selectedId, onSave, onOpenSource, onClose }: {
  project: StoryProject; selectedId: string; onSave: (value: WritingVariable) => void;
  onOpenSource: (sceneId: string, sourceId: string) => void; onClose: () => void;
}) {
  const variables = project.writingVariables ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(selectedId || variables[0]?.id || "");
  const current = variables.find(v => v.id === selected);
  return <div className="variable-overlay"><section className="variable-library" role="dialog" aria-modal="true" aria-label="變數庫" onKeyDown={e => { if (e.key === "Tab") { const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')); const first = items[0], last = items.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } if(e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
    <header><div><h2>變數庫</h2><p>先記下靈感，細節稍後再補。待設定 {variables.filter(v => v.status === "pending").length} 項</p></div><button autoFocus onClick={onClose}>返回寫作</button></header>
    <div className="variable-library-columns"><aside><input aria-label="搜尋變數" value={query} placeholder="搜尋名稱或說明…" onChange={e => setQuery(e.target.value)} /><select aria-label="變數狀態篩選" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部</option><option value="pending">待設定</option><option value="ready">已設定</option></select>
      {variables.filter(v => (filter === "all" || v.status === filter) && `${v.name} ${v.notes}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(v => <button key={v.id} aria-pressed={selected === v.id} onClick={() => setSelected(v.id)}><strong>{v.name}</strong><small>{v.status === "pending" ? "待設定" : variableKinds[v.kind]} · {v.sources.length} 處引用</small></button>)}
      {!variables.length && <p>在正文反白關鍵詞，按右鍵「加入互動變數」。</p>}
    </aside><main>{current ? <VariableDetails key={current.id} variable={current} project={project} onSave={onSave} onOpenSource={onOpenSource} /> : <p>選擇變數以補充設定。</p>}</main></div>
  </section></div>;
}
function VariableDetails({ variable, project, onSave, onOpenSource }: { variable: WritingVariable; project: StoryProject; onSave: (v: WritingVariable) => void; onOpenSource: (scene: string, source: string) => void }) {
  const [draft, setDraft] = useState(variable);
  const [notice, setNotice] = useState("");
  const save = (status: WritingVariable["status"]) => {
    try {
      const value = { ...draft, name: draft.name.trim(), status };
      if ((project.writingVariables ?? []).some(v => v.id !== value.id && v.name === value.name)) throw new Error("已有同名變數，請保留不同名稱。");
      if (value.ownerId && !project.entities.some(e => e.id === value.ownerId && e.type === "character")) throw new Error("所屬人物已移除，請重新選擇。");
      validateWritingVariables([value]); onSave(value); setDraft(value); setNotice(status === "ready" ? "已儲存並標記為已設定。" : "已保存草稿，可稍後補齊。");
    } catch(e) { setNotice((e as Error).message); }
  };
  return <><h3>{variable.name}</h3><label>變數名稱<input aria-label="變數名稱" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
    <label>變數類型<select aria-label="變數類型" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as WritingVariable["kind"], initial: 0, status: "pending" })}>{Object.entries(variableKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label>所屬人物<select aria-label="所屬人物" value={draft.ownerId} onChange={e => setDraft({ ...draft, ownerId: e.target.value })}><option value="">全域／未指定人物</option>{draft.ownerId && !project.entities.some(e => e.id === draft.ownerId) && <option value={draft.ownerId}>原人物已移除</option>}{project.entities.filter(e => e.type === "character").map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
    {(draft.kind === "item" || draft.kind === "number") && <label>初始值<input aria-label="初始值" type="number" step={draft.kind === "item" ? 1 : "any"} value={Number.isNaN(draft.initial) ? "" : draft.initial} onChange={e => setDraft({ ...draft, initial: e.target.valueAsNumber })} /></label>}
    {(draft.kind === "knowledge" || draft.kind === "state") && <label><input type="checkbox" checked={draft.initial === 1} onChange={e => setDraft({ ...draft, initial: e.target.checked ? 1 : 0 })} />{draft.kind === "knowledge" ? "起始已知" : "起始已啟用"}</label>}
    <label>說明與變化構想<textarea aria-label="說明與變化構想" placeholder="例如：讀完密信後得知；取得鑰匙後才可開門…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
    <footer><button onClick={() => save("pending")}>儲存草稿</button><button onClick={() => save("ready")}>儲存並完成設定</button></footer><p role="status">{notice}</p><small>目前先收集及管理設定，不會自動取得物品或參與試讀運算。離開前請儲存。</small>
    <h3>原句與出現位置</h3>{variable.sources.map(s => { const doc = project.documents[s.documentId]; const text = doc ? sourceText(doc.content, s.id) : ""; const scene = project.nodes.find(n => n.id === s.sceneId && n.documentId === s.documentId); return <article key={s.id} className="variable-source"><strong>{scene?.title ?? "來源場景已移除"}</strong><blockquote>{s.context}</blockquote><small>收集時：{s.quote}{text && text !== s.quote ? ` ｜目前：${text}` : ""}</small><p>{text && scene ? "原文連結有效" : "待重新定位：原文標記已移除，可反白文字後連結既有變數。"}</p><button disabled={!scene || !text} onClick={() => onOpenSource(s.sceneId, s.id)}>定位原文</button></article>; })}
  </>;
}
