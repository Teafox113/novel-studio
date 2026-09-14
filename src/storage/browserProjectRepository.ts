import type {
  ProjectRepository,
  ProjectSnapshot,
  StoryProject,
} from "../domain/models";
import { migrateStoryProject } from "../domain/migrations";

const STORAGE_KEY = "novel-studio.project.v1";
const SNAPSHOT_STORAGE_KEY = "novel-studio.snapshots.v1";
const MAX_BROWSER_SNAPSHOTS = 20;

export class BrowserProjectRepository implements ProjectRepository {
  readonly kind = "browser" as const;
  readonly label = "瀏覽器原型";

  async load(): Promise<StoryProject | null> {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      return migrateStoryProject(JSON.parse(stored));
    } catch {
      return null;
    }
  }

  async save(project: StoryProject): Promise<void> {
    const projects = JSON.parse(window.localStorage.getItem("novel-studio.library.v1") ?? "{}") as Record<string, StoryProject>;
    const previous = await this.load();
    if (previous) projects[previous.id] = previous;
    projects[project.id] = project;
    window.localStorage.setItem("novel-studio.library.v1", JSON.stringify(projects));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  async listProjects(): Promise<Array<{ id: string; title: string }>> {
    const projects = JSON.parse(window.localStorage.getItem("novel-studio.library.v1") ?? "{}") as Record<string, StoryProject>;
    const active = await this.load();
    if (active) projects[active.id] = active;
    return Object.values(projects).map(({ id, title }) => ({ id, title }));
  }

  async loadProject(id: string): Promise<StoryProject | null> {
    const active = await this.load();
    if (active?.id === id) return active;
    const projects = JSON.parse(window.localStorage.getItem("novel-studio.library.v1") ?? "{}") as Record<string, StoryProject>;
    return projects[id] ? migrateStoryProject(projects[id]) : null;
  }

  async createSnapshot(project: StoryProject, label: string): Promise<void> {
    const stored = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    let snapshots: ProjectSnapshot[] = [];

    if (stored) {
      try {
        snapshots = JSON.parse(stored) as ProjectSnapshot[];
      } catch {
        snapshots = [];
      }
    }

    snapshots.unshift({
      id: crypto.randomUUID(),
      projectId: project.id,
      label,
      project: structuredClone(project),
      createdAt: new Date().toISOString(),
    });

    window.localStorage.setItem(
      SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshots.slice(0, MAX_BROWSER_SNAPSHOTS)),
    );
  }

  async listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    const stored = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!stored) return [];

    try {
      return (JSON.parse(stored) as ProjectSnapshot[])
        .filter((snapshot) => snapshot.projectId === projectId)
        .map((snapshot) => ({
          ...snapshot,
          project: migrateStoryProject(snapshot.project),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
