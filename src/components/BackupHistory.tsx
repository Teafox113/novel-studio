import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StoryProject } from "../domain/models";
import type { BackupSlot } from "../storage/folderBackup";
import { parsePortableProject } from "../portable/projectArchive";
import { compareProjectVersions } from "../domain/snapshotComparison";

export function BackupHistory({ slot, project, onRestore }: { slot: BackupSlot; project: StoryProject | null; onRestore: (project: StoryProject, name: string) => Promise<boolean> }) {
  const [entries, setEntries] = useState<Array<{name: string; modified: number; size: number}>>([]);
  const [preview, setPreview] = useState<{ project: StoryProject; name: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const load = async () => {
    setBusy(true); setError(""); setPreview(null);
    try { setEntries(await invoke("backup_list", { slot })); }
    catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  };
  const read = async (name: string) => {
    setBusy(true); setError(""); setPreview(null);
    try { setPreview({ name, project: parsePortableProject(await invoke<string>("backup_read", { slot, name })) }); }
    catch (e) { setError(`無法預覽：${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  };
  const changes = preview && project ? compareProjectVersions(preview.project, project) : [];
  return <details className="backup-history"><summary>備份歷史與還原預覽</summary>
    <button disabled={busy} onClick={() => void load()}>讀取／重新整理歷史</button>
    <p>最多顯示最近 200 份。先預覽核對作品，再還原；不會刪除備份檔。</p>
    <div className="backup-history-list">{entries.map(e => <button key={e.name} disabled={busy} onClick={() => void read(e.name)}>{new Date(e.modified * 1000).toLocaleString("zh-TW")} · {(e.size / 1024).toFixed(1)} KB<br /><small>{e.name}</small></button>)}</div>
    {preview && <section aria-label="備份預覽"><h4>{preview.project.title}</h4><p>{preview.project.nodes.filter(n => n.kind === "scene").length} 個場景 · {preview.project.inspirations.length} 則靈感／便條</p>
      {project && preview.project.id !== project.id && <p>這是另一部作品的備份。還原後將切換作品。</p>}
      <p>備份與目前已儲存版本有 {changes.length} 項差異：</p><ul>{changes.slice(0, 12).map((c,i) => <li key={i}>{c.category} · {c.title} · {c.kind}</li>)}</ul>
      <p>還原前會保存目前作品的安全快照。安全快照失敗時不會進行還原。</p>
      <button disabled={busy} onClick={async () => { setBusy(true); try { if (await onRestore(preview.project, preview.name)) setPreview(null); } catch(e) { setError(String(e)); } finally { setBusy(false); } }}>還原這份備份…</button>
    </section>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
