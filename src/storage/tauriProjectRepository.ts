import Database from "@tauri-apps/plugin-sql";
import type {
  ProjectRepository,
  ProjectSnapshot,
  StoryProject,
} from "../domain/models";
import { migrateStoryProject } from "../domain/migrations";

const DATABASE_URL = "sqlite:novel-studio.db";

interface ProjectRow {
  project_json: string;
}

interface SnapshotRow {
  id: string;
  project_id: string;
  label: string;
  project_json: string;
  created_at: string;
}

export class TauriProjectRepository implements ProjectRepository {
  readonly kind = "sqlite" as const;
  readonly label = "SQLite 桌面資料庫";
  private databasePromise: Promise<Database> | null = null;

  private database(): Promise<Database> {
    if (!this.databasePromise) {
      this.databasePromise = Database.load(DATABASE_URL);
    }
    return this.databasePromise;
  }

  async load(): Promise<StoryProject | null> {
    const database = await this.database();
    const rows = await database.select<ProjectRow[]>(
      `SELECT project_json
       FROM app_projects
       ORDER BY updated_at DESC
       LIMIT 1`,
    );

    if (rows.length === 0) return null;

    try {
      return migrateStoryProject(JSON.parse(rows[0].project_json));
    } catch {
      throw new Error("SQLite 中的小說專案資料無法解析。");
    }
  }

  async save(project: StoryProject): Promise<void> {
    const database = await this.database();
    const now = new Date().toISOString();

    await database.execute(
      `INSERT INTO app_projects (
         id,
         schema_version,
         title,
         project_json,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT(id) DO UPDATE SET
         schema_version = excluded.schema_version,
         title = excluded.title,
         project_json = excluded.project_json,
         updated_at = excluded.updated_at`,
      [
        project.id,
        project.schemaVersion,
        project.title,
        JSON.stringify(project),
        now,
      ],
    );
  }

  async createSnapshot(project: StoryProject, label: string): Promise<void> {
    const database = await this.database();
    await this.save(project);
    await database.execute(
      `INSERT INTO project_snapshots (
         id,
         project_id,
         label,
         project_json,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        crypto.randomUUID(),
        project.id,
        label,
        JSON.stringify(project),
        new Date().toISOString(),
      ],
    );
  }

  async listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    const database = await this.database();
    const rows = await database.select<SnapshotRow[]>(
      `SELECT id, project_id, label, project_json, created_at
       FROM project_snapshots
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [projectId],
    );

    return rows.flatMap((row) => {
      try {
        return [
          {
            id: row.id,
            projectId: row.project_id,
            label: row.label,
            project: migrateStoryProject(JSON.parse(row.project_json)),
            createdAt: row.created_at,
          },
        ];
      } catch {
        return [];
      }
    });
  }

  async clear(): Promise<void> {
    const database = await this.database();
    await database.execute("DELETE FROM app_projects");
  }
}
