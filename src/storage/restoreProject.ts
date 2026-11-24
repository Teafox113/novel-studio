import type { ProjectRepository, StoryProject } from "../domain/models";

/** Do not replace either work until every affected project's recovery snapshot exists. */
export async function restoreProject(repository: ProjectRepository, current: StoryProject, incoming: StoryProject, label: string): Promise<StoryProject> {
  const restored = structuredClone(incoming);
  await repository.createSnapshot(current, label);
  if (current.id !== restored.id) {
    const existing = await repository.loadProject(restored.id);
    if (existing) await repository.createSnapshot(existing, label);
  }
  await repository.save(restored);
  return restored;
}
