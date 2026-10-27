import type { StoryProject } from "../domain/models";
import { serializePortableProject } from "../portable/projectArchive";

export type BackupSlot = "local" | "drive";
export type BackupConfig = Record<BackupSlot, string | null>;
export interface BackupStatus { message: string; error: boolean; filename?: string; projectTitle?: string }
export type BackupWriter = (slot: BackupSlot, content: string) => Promise<string>;

/** Each destination advances independently; a failed Drive write cannot mask a local success. */
export class FolderBackupRunner {
  private completed = new Map<string, string>();
  private running = false;
  async run(project: StoryProject, config: BackupConfig, write: BackupWriter, report: (slot: BackupSlot, status: BackupStatus) => void, force = false): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const fingerprint = JSON.stringify(project);
      const content = serializePortableProject(project);
      for (const slot of ["local", "drive"] as const) {
        const folder = config[slot];
        if (!folder) continue;
        const key = `${slot}:${folder}:${project.id}`;
        if (!force && this.completed.get(key) === fingerprint) continue;
        report(slot, { message: "正在寫入備份…", error: false, projectTitle: project.title });
        try {
          const filename = await write(slot, content);
          this.completed.set(key, fingerprint);
          report(slot, { message: `${new Date().toLocaleString("zh-TW")} · 已寫入${slot === "drive" ? "，雲端進度請查看 Drive 電腦版" : ""}`, error: false, filename, projectTitle: project.title });
        } catch (e) {
          report(slot, { message: `備份失敗：${e instanceof Error ? e.message : String(e)}。請確認位置後重試。`, error: true, projectTitle: project.title });
        }
      }
    } finally { this.running = false; }
  }
}
