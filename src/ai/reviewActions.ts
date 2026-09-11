import type { AiFinding, AiFindingStatus, StoryProject } from "../domain/models";

export function applyAiReview(
  project: StoryProject,
  finding: AiFinding,
  status: Extract<AiFindingStatus, "accepted" | "dismissed">,
  reviewedAt: string,
  createId: () => string = () => crypto.randomUUID(),
): StoryProject {
  let nodes = project.nodes;
  let entities = project.entities;
  let sceneEntityLinks = project.sceneEntityLinks;

  if (status === "accepted") {
    if (finding.action.type === "set-scene-synopsis") {
      nodes = nodes.map((node) =>
        node.id === finding.action.sceneId
          ? { ...node, synopsis: finding.action.value, updatedAt: reviewedAt }
          : node,
      );
    } else if (finding.action.type === "set-entity-attribute") {
      entities = entities.map((entity) =>
        entity.id === finding.action.entityId
          ? {
              ...entity,
              attributes: {
                ...entity.attributes,
                [finding.action.key]: finding.action.value,
              },
              updatedAt: reviewedAt,
            }
          : entity,
      );
    } else if (finding.action.type === "add-scene-entity-link") {
      const exists = sceneEntityLinks.some(
        (link) =>
          link.sceneId === finding.action.sceneId &&
          link.entityId === finding.action.entityId &&
          link.role === "mentioned",
      );
      if (!exists) {
        sceneEntityLinks = [
          ...sceneEntityLinks,
          {
            id: createId(),
            sceneId: finding.action.sceneId,
            entityId: finding.action.entityId,
            role: "mentioned",
            source: "ai-candidate",
            createdAt: reviewedAt,
          },
        ];
      }
    }
  }

  return {
    ...project,
    nodes,
    entities,
    sceneEntityLinks,
    aiFindings: project.aiFindings.map((item) =>
      item.id === finding.id ? { ...item, status, reviewedAt } : item,
    ),
    updatedAt: reviewedAt,
  };
}
