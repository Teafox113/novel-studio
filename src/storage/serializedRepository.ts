import type { ProjectRepository } from "../domain/models";

/** One queue per app instance: older autosaves must finish before snapshot/restore writes. */
export function serializedRepository(source: ProjectRepository): ProjectRepository {
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    kind: source.kind, label: source.label,
    load: () => enqueue(() => source.load()),
    listProjects: () => enqueue(() => source.listProjects()),
    loadProject: id => enqueue(() => source.loadProject(id)),
    save: p => { const copy = structuredClone(p); return enqueue(() => source.save(copy)); },
    createSnapshot: (p, label) => { const copy = structuredClone(p); return enqueue(() => source.createSnapshot(copy, label)); },
    listSnapshots: id => enqueue(() => source.listSnapshots(id)),
    clear: () => enqueue(() => source.clear()),
  };
}
