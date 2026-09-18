import { useState } from "react";
import type { StoryProject } from "../domain/models";
import { backBook, blockLabel, blockNumber, bookFingerprint, bookProblems, chooseBook, initialBook, liveBlocks, startBook, syncBook, type BookBlock, type BookSession, type InteractiveBook as Book } from "../domain/interactiveBook";

interface Props { project: StoryProject; onChange: (project: StoryProject) => void; onOpenScene: (id: string) => void }
function update(project: StoryProject, book: Book): StoryProject {
  return { ...project, interactiveBook: book, updatedAt: new Date().toISOString() };
}
export function BranchEditor({ project, sceneId, onChange, onOpenScene }: Props & { sceneId: string }) {
  const book = project.interactiveBook;
  const block = book?.blocks.find(b => b.sceneId === sceneId);
  const [removed, setRemoved] = useState<{ choice: BookBlock["choices"][number]; index: number } | null>(null);
  if (!book?.enabled || !block) return null;
  const patch = (value: Partial<BookBlock>) => onChange(update(project, { ...book, blocks: book.blocks.map(b => b.sceneId === sceneId ? { ...b, ...value } : b) }));
  const targets = liveBlocks(project, book);
  const targetPicker = (value: string, onSelect: (value: string) => void, label: string) => <div className="branch-target"><select aria-label={label} value={value} onChange={e => onSelect(e.target.value)}><option value="">選擇跳往編號</option>{value && !targets.some(b => b.sceneId === value) && <option value={value}>目標已移除，請重新指定</option>}{targets.map(b => <option key={b.sceneId} value={b.sceneId}>{blockLabel(project, b)}</option>)}</select><button disabled={!targets.some(b => b.sceneId === value)} onClick={() => onOpenScene(value)}>查看目標</button></div>;
  return <section className="branch-editor" aria-label="接下來的劇情">
    <header><h3>{blockNumber(block.number)} · 接下來</h3><button aria-pressed={book.startId === sceneId} onClick={() => onChange(update(project, { ...book, startId: sceneId }))}>{book.startId === sceneId ? "目前起點" : "設為起點"}</button></header>
    <label>閱讀方式<select aria-label="閱讀方式" value={block.mode} onChange={e => patch({ mode: e.target.value as BookBlock["mode"] })}><option value="choices">讓讀者選擇</option><option value="continue">直接繼續</option><option value="ending">在此結束</option></select></label>
    {block.mode === "continue" && targetPicker(block.targetId, targetId => patch({ targetId }), "繼續閱讀目標")}
    {block.mode === "ending" && <p>這一塊是結局，試讀到這裡即結束。</p>}
    {block.mode === "choices" && <><p>填寫選項文字，再選擇跳往哪個編號。設定自動儲存。</p>{block.choices.map((c, i) => <div key={c.id} className="branch-choice"><input aria-label={`選項 ${i + 1} 文字`} placeholder="例如：拿走鑰匙" value={c.text} onChange={e => patch({ choices: block.choices.map(x => x.id === c.id ? { ...x, text: e.target.value } : x) })} />{targetPicker(c.targetId, targetId => patch({ choices: block.choices.map(x => x.id === c.id ? { ...x, targetId } : x) }), `選項 ${i + 1} 目標`)}<button aria-label={`移除選項 ${i + 1}`} onClick={() => { setRemoved({ choice: c, index: i }); patch({ choices: block.choices.filter(x => x.id !== c.id) }); }}>移除</button></div>)}<button onClick={() => patch({ choices: [...block.choices, { id: crypto.randomUUID(), text: "", targetId: "" }] })}>＋新增選項</button></>}
    {removed && <button onClick={() => { const choices = [...block.choices]; choices.splice(removed.index, 0, removed.choice); patch({ choices }); setRemoved(null); }}>復原移除的選項</button>}
    <small>切換閱讀方式會保留原選項；試讀只使用目前選擇的方式。</small>
  </section>;
}

export function InteractiveBookWorkspace({ project, onChange, onOpenScene }: Props) {
  const book = project.interactiveBook;
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<BookSession | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plan" | "read">("plan");
  const blocks = book ? liveBlocks(project, book) : [];
  const currentId = blocks.some(b => b.sceneId === selected) ? selected : blocks[0]?.sceneId ?? "";
  const issues = book ? bookProblems(project, book) : [];
  const current = session?.blocks.find(b => b.sceneId === session.path.at(-1));
  const stale = session && book && session.source !== bookFingerprint(project, book);
  const start = () => { try { if (book) { setSession(startBook(project, book)); setError(""); setTab("read"); } } catch (e) { setError((e as Error).message); } };
  return <div className="interactive-workspace">
    <header className="interactive-header"><div><span className="eyebrow">INTERACTIVE BOOK</span><h1>互動書籍</h1><p>用編號連接劇情，寫完就能試讀。</p></div><label className="interactive-toggle"><input type="checkbox" checked={book?.enabled ?? false} onChange={e => { onChange(update(project, { ...syncBook(project, book ?? initialBook(project)), enabled: e.target.checked })); setSession(null); setError(""); }} />互動分支模式</label></header>
    {!book?.enabled ? <div className="interactive-empty"><h2>把故事寫成可以選擇的旅程</h2><p>開啟後，每個手稿場景會取得固定編號。在正文下方設定選項與目的地即可。</p><p>關閉模式只會隱藏設定，不會刪除分支或正文。</p></div> : <>
      <nav className="interactive-tabs"><button aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>劇情塊與跳轉</button><button aria-pressed={tab === "read"} onClick={() => setTab("read")}>試讀</button><button disabled={issues.length > 0} onClick={start}>從起點開始試讀</button></nav>
      {error && <p role="alert">{error}</p>}
      {tab === "plan" ? <div className="interactive-columns"><aside className="interactive-list"><input aria-label="搜尋劇情編號或名稱" placeholder="搜尋編號或名稱…" value={query} onChange={e => setQuery(e.target.value)} />{blocks.filter(b => blockLabel(project, b).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(b => <button key={b.sceneId} aria-pressed={currentId === b.sceneId} onClick={() => setSelected(b.sceneId)}><strong>{blockLabel(project, b)}</strong><small>{book.startId === b.sceneId ? "起點 · " : ""}{b.mode === "ending" ? "結局" : b.mode === "continue" ? "直接繼續" : `${b.choices.length} 個選項`}</small></button>)}{!blocks.length && <p>請先在手稿新增場景。</p>}</aside><main className="interactive-detail">{currentId && <><button onClick={() => onOpenScene(currentId)}>編輯這一塊的正文 ↗</button><BranchEditor key={currentId} project={project} sceneId={currentId} onChange={onChange} onOpenScene={onOpenScene} /></>}
        <section className="branch-checks"><h3>分支檢查 {issues.length ? `· ${issues.length} 項待設定` : "· 可以試讀"}</h3>{issues.map((i, index) => <button key={index} onClick={() => { if (i.sceneId) setSelected(i.sceneId); }}>{i.message}</button>)}<small>本階段支援文字選項與編號跳轉；人物條件、物品變化及句旁註記尚未接入。</small></section></main></div> : <section className="book-reader" aria-label="互動試讀">
        {stale && <p role="status">正文或分支已修改。目前顯示開始試讀時的版本，請重新開始套用修改。</p>}
        {current && session ? <><header><span>{blockNumber(current.number)}</span><h2>{current.title}</h2></header><div className="book-reader-text">{current.text || "（此劇情塊尚無正文）"}</div><div className="book-reader-choices">{current.choices.map(c => <button key={c.id} onClick={() => { try { setSession(chooseBook(session, c.id)); } catch (e) { setError((e as Error).message); } }}>{c.text}</button>)}</div>{current.mode === "ending" && <p className="book-ending">故事在此結束</p>}<footer><button disabled={session.path.length < 2} onClick={() => setSession(backBook(session))}>回退一步</button><button disabled={issues.length > 0} onClick={start}>重新開始</button><button onClick={() => onOpenScene(current.sceneId)}>編輯此塊</button></footer><details><summary>已走過 {session.path.length} 個劇情塊</summary><p>{session.path.map(id => blockNumber(session.blocks.find(b => b.sceneId === id)!.number)).join(" → ")}</p></details></> : <p>完成各塊的選項或結局設定，再按「從起點開始試讀」。試讀不修改正文與人物卡。</p>}
      </section>}
    </>}
  </div>;
}
