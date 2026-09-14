import { useState } from "react";

export function ProjectLibrary({ projects, currentId, busy, error, onCreate, onCopy, onOpen, onClose }: {
  projects: Array<{ id: string; title: string }>; currentId: string; busy: boolean; error: string;
  onCreate: (title: string, author: string) => void; onCopy: (title: string) => void; onOpen: (id: string) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  return <div className="dialog-backdrop"><section className="project-library" role="dialog" aria-modal="true" aria-labelledby="library-title">
    <header><h2 id="library-title">我的小說專案</h2><button onClick={onClose} disabled={busy}>關閉</button></header>
    <p>新建空白小說，或將目前作品另存為獨立副本。切換前會保存目前作品並建立安全快照。</p>
    <label>小說／副本名稱<input value={title} onChange={event => setTitle(event.target.value)} disabled={busy} /></label>
    <label>作者（新建小說使用）<input value={author} onChange={event => setAuthor(event.target.value)} disabled={busy} /></label>
    <div className="library-actions"><button disabled={busy || !title.trim()} onClick={() => onCreate(title, author)}>新建空白小說</button><button disabled={busy || !title.trim()} onClick={() => onCopy(title)}>目前作品另存副本</button></div>
    {error && <p role="alert">{error}</p>}
    <h3>本機作品</h3><div className="library-list">{projects.map(item => <button key={item.id} disabled={busy || item.id === currentId} onClick={() => onOpen(item.id)}>{item.title}{item.id === currentId ? " · 目前作品" : " · 開啟"}</button>)}</div>
    <p>這裡的作品保存在本機。搬到其他電腦，請使用「匯出專案」產生 .novel 檔。</p>
  </section></div>;
}
