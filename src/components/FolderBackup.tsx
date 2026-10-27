import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StoryProject } from "../domain/models";
import { isTauriRuntime } from "../storage/createProjectRepository";
import { FolderBackupRunner, type BackupConfig, type BackupSlot, type BackupStatus } from "../storage/folderBackup";

export function FolderBackup({ project, canBackup, open, onClose, onProblem }: { project: StoryProject | null; canBackup: boolean; open: boolean; onClose: () => void; onProblem: (problem: boolean) => void }) {
  const desktop = isTauriRuntime();
  const [config, setConfig] = useState<BackupConfig>({ local: null, drive: null });
  const [status, setStatus] = useState<Partial<Record<BackupSlot, BackupStatus>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const current = useRef({ project, config }); current.current = { project, config };
  const runner = useRef(new FolderBackupRunner());
  const working = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!desktop) return;
    invoke<BackupConfig>("backup_config").then(c => { setConfig(c); setLoaded(true); }).catch(e => setError(String(e)));
  }, [desktop]);
  useEffect(() => { onProblem(!!error || Object.values(status).some(s => s?.error)); }, [error, status, onProblem]);
  const run = async (force = false) => {
    const { project, config } = current.current;
    if (!desktop || !project || working.current) return;
    working.current = true; setBusy(true);
    try {
      await runner.current.run(project, config, (slot, content) => invoke<string>("backup_write", { slot, content }), (slot, next) => setStatus(s => ({ ...s, [slot]: next })), force);
    } catch (e) { setError(String(e)); }
    finally { working.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!desktop || !loaded) return;
    const timer = window.setInterval(() => { void run(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [desktop, loaded]);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const change = async (slot: BackupSlot, disconnect = false) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try {
      const next = await invoke<BackupConfig>(disconnect ? "backup_disconnect" : "backup_select", { slot });
      setConfig(next); setLoaded(true); setStatus(s => ({ ...s, [slot]: undefined }));
    } catch (e) { setError(String(e)); }
    finally { working.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="folder-backup-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="folder-backup-title">
    <header><h2 id="folder-backup-title">資料夾與同步備份</h2><button onClick={onClose} autoFocus>關閉</button></header>
    <p>作品先保存在本機資料庫，再將完整 .novel 副本存至你選擇的資料夾。可以只選一個位置，也可以兩者同時備份。</p>
    {!desktop ? <p role="status">自動資料夾備份目前適用 Windows 桌面版。瀏覽器版請使用「匯出專案」自行選擇儲存位置。</p> : <>
      <p>開啟程式期間每分鐘檢查已儲存的作品；內容有變更才新增備份。檔案會持續累積，不會自動刪除舊版本。退出前可按「立即備份」。</p>
      {(["local", "drive"] as const).map(slot => <section key={slot} className="folder-backup-destination"><h3>{slot === "local" ? "本機資料夾" : "Google Drive 電腦版資料夾"}</h3><p className="backup-path">{config[slot] ?? "尚未選擇"}</p>
        {slot === "drive" && <p>先登入 Google Drive 電腦版，再選其同步範圍內的資料夾。此處不會驗證 Google 帳號或確認雲端上傳完成；離線可用性由 Drive 的串流／鏡像設定決定。</p>}
        <button disabled={busy || !loaded} onClick={() => void change(slot)}>選擇資料夾</button> <button disabled={busy || !config[slot]} onClick={() => void change(slot, true)}>停止此處備份</button>
        {status[slot] && <p role={status[slot]!.error ? "alert" : "status"}>{status[slot]!.projectTitle} · {status[slot]!.message}<br /><small>{status[slot]!.filename}</small></p>}
      </section>)}
      <button disabled={busy || !loaded || !canBackup || !project || (!config.local && !config.drive)} onClick={() => void run(true)}>{busy ? "處理中…" : "立即備份到已選位置"}</button>
      {!canBackup && <p>目前作品尚未完成儲存，完成後即可手動備份。</p>}
      <p>還原：使用「⋯ → 匯入專案」選取備份資料夾中的 .novel 檔。這是版本備份，不會自動以雲端檔案覆蓋目前作品。</p>
    </>}
    {error && <p role="alert">{error}</p>}
  </dialog>;
}
