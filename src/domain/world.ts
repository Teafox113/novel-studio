import type {
  EntityRelation,
  EntityType,
  StoryEntity,
  StoryProject,
} from "./models";

export type EntityTypeFilter = EntityType | "all";

export interface EntityBacklinks {
  sceneIds: string[];
  inspirationIds: string[];
  researchIds: string[];
}

function searchableEntityText(entity: StoryEntity): string {
  return [
    entity.name,
    entity.summary,
    ...entity.aliases,
    ...Object.entries(entity.attributes).flat(),
  ]
    .join(" ")
    .toLocaleLowerCase("zh-TW");
}

export function filterWorldEntities(
  entities: StoryEntity[],
  query: string,
  type: EntityTypeFilter,
): StoryEntity[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-TW");
  return entities.filter(
    (entity) =>
      (type === "all" || entity.type === type) &&
      (!normalizedQuery || searchableEntityText(entity).includes(normalizedQuery)),
  );
}

export function relationsForEntity(
  relations: EntityRelation[],
  entityId: string,
): EntityRelation[] {
  return relations.filter(
    (relation) =>
      relation.fromEntityId === entityId || relation.toEntityId === entityId,
  );
}

export function backlinksForEntity(
  project: StoryProject,
  entityId: string,
): EntityBacklinks {
  return {
    sceneIds: Array.from(
      new Set(
        project.sceneEntityLinks
          .filter((link) => link.entityId === entityId)
          .map((link) => link.sceneId),
      ),
    ),
    inspirationIds: project.inspirations
      .filter((item) => item.linkedEntityIds.includes(entityId))
      .map((item) => item.id),
    researchIds: project.researchItems
      .filter((item) => item.linkedEntityIds.includes(entityId))
      .map((item) => item.id),
  };
}
