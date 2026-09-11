import type {
  AiFinding,
  AiFindingAction,
  AiFindingKind,
  AiFindingSeverity,
  AiFindingTargetType,
  ProjectNode,
  StoryEntity,
  StoryProject,
} from "../domain/models";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

function emptyAction(): AiFindingAction {
  return { type: "none", key: "", value: "", entityId: "", sceneId: "" };
}

interface FindingInput {
  fingerprint: string;
  kind: AiFindingKind;
  severity: AiFindingSeverity;
  targetType: AiFindingTargetType;
  targetId: string;
  title: string;
  explanation: string;
  suggestion: string;
  evidence?: AiFinding["evidence"];
  action?: AiFindingAction;
}

function finding(input: FindingInput, detectedAt: string): AiFinding {
  return {
    id: `ai-${stableHash(input.fingerprint)}`,
    fingerprint: input.fingerprint,
    kind: input.kind,
    status: "pending",
    severity: input.severity,
    targetType: input.targetType,
    targetId: input.targetId,
    title: input.title,
    explanation: input.explanation,
    suggestion: input.suggestion,
    evidence: input.evidence ?? [],
    action: input.action ?? emptyAction(),
    detectedAt,
    reviewedAt: "",
  };
}

function sceneText(project: StoryProject, scene: ProjectNode): string {
  return scene.documentId ? project.documents[scene.documentId]?.plainText ?? "" : "";
}

export function suggestSceneSummary(text: string, title = ""): string {
  const normalizedTitle = title.replace(/^\s*\d+[\s　、._-]*/, "").trim();
  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => index > 0 || !normalizedTitle || !line.includes(normalizedTitle));
  const sentences = lines
    .join("")
    .split(/(?<=[。！？!?])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const candidate = (sentences.slice(0, 2).join("") || lines[0] || "").trim();
  return candidate.length > 120 ? `${candidate.slice(0, 117)}…` : candidate;
}

function characterAgeKey(entity: StoryEntity): string | null {
  return Object.keys(entity.attributes).find((key) =>
    ["年齡", "年龄", "age"].includes(key.toLocaleLowerCase()),
  ) ?? null;
}

export function analyzeProjectLocally(
  project: StoryProject,
  detectedAt = new Date().toISOString(),
): AiFinding[] {
  const findings: AiFinding[] = [];
  const scenes = project.nodes.filter((node) => node.kind === "scene");

  for (const scene of scenes) {
    const links = project.sceneEntityLinks.filter((link) => link.sceneId === scene.id);
    if (!links.some((link) => link.role === "pov")) {
      findings.push(finding({
        fingerprint: `missing-pov:${scene.id}`,
        kind: "missing-metadata",
        severity: "warning",
        targetType: "scene",
        targetId: scene.id,
        title: "場景缺少視角人物",
        explanation: `「${scene.title}」尚未指定 POV，人物行程與知情範圍將難以校對。`,
        suggestion: "開啟場景檢查器並選擇視角人物。",
      }, detectedAt));
    }
    if (!links.some((link) => link.role === "location")) {
      findings.push(finding({
        fingerprint: `missing-location:${scene.id}`,
        kind: "missing-metadata",
        severity: "warning",
        targetType: "scene",
        targetId: scene.id,
        title: "場景缺少地點",
        explanation: `「${scene.title}」尚未連結地點，無法檢查人物是否能在合理時間抵達。`,
        suggestion: "開啟場景檢查器並選擇主要地點。",
      }, detectedAt));
    }

    const text = sceneText(project, scene);
    if (!scene.synopsis.trim() && text.trim()) {
      const summary = suggestSceneSummary(text, scene.title);
      if (summary) findings.push(finding({
        fingerprint: `summary:${scene.id}:${stableHash(summary)}`,
        kind: "summary",
        severity: "info",
        targetType: "scene",
        targetId: scene.id,
        title: "場景摘要候選",
        explanation: `根據「${scene.title}」開頭內容整理，可採用後再自行修改。`,
        suggestion: summary,
        evidence: [{ sceneId: scene.id, quote: excerpt(text, 0, Math.min(text.length, 100)) }],
        action: { type: "set-scene-synopsis", key: "synopsis", value: summary, entityId: "", sceneId: scene.id },
      }, detectedAt));
    }

    const linkedEntityIds = new Set(links.map((link) => link.entityId));
    for (const entity of project.entities) {
      if (linkedEntityIds.has(entity.id)) continue;
      const names = [entity.name, ...entity.aliases]
        .map((name) => name.trim())
        .filter((name) => name.length >= 2);
      const matchedName = names.find((name) => text.includes(name));
      if (!matchedName) continue;
      const index = text.indexOf(matchedName);
      findings.push(finding({
        fingerprint: `missing-link:${scene.id}:${entity.id}`,
        kind: "missing-link",
        severity: "info",
        targetType: "scene",
        targetId: scene.id,
        title: `可能提及「${entity.name}」`,
        explanation: `正文出現名稱或別名，但「${scene.title}」尚未連結這筆世界觀資料。`,
        suggestion: `將「${entity.name}」以「提及」角色連結到此場景。`,
        evidence: [{ sceneId: scene.id, quote: excerpt(text, index, matchedName.length) }],
        action: { type: "add-scene-entity-link", key: "mentioned", value: "mentioned", entityId: entity.id, sceneId: scene.id },
      }, detectedAt));
    }
  }

  for (const event of project.timelineEvents) {
    if (!event.storyTimeLabel.trim() || event.storyTimeLabel === "未設定故事時間") {
      findings.push(finding({
        fingerprint: `missing-story-time:${event.id}`,
        kind: "missing-metadata",
        severity: "warning",
        targetType: "timeline",
        targetId: event.id,
        title: "時間事件尚未定位",
        explanation: `「${event.title}」沒有故事內時間，暫時無法進行年齡與事件先後檢查。`,
        suggestion: "在雙軸時間線填入日期、年代或相對時間。",
      }, detectedAt));
    }
  }

  for (const entity of project.entities.filter((item) => item.type === "character")) {
    const names = [entity.name, ...entity.aliases]
      .map((name) => name.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);
    if (names.length === 0) continue;
    const namePattern = names.map(escapeRegex).join("|");
    const observations: Array<{ age: string; sceneId: string; quote: string }> = [];
    for (const scene of scenes) {
      const text = sceneText(project, scene);
      const patterns = [
        new RegExp(`(?:${namePattern})[^。！？\\n]{0,14}?(\\d{1,3})\\s*歲`, "gu"),
        new RegExp(`(\\d{1,3})\\s*歲[^。！？\\n]{0,14}?(?:${namePattern})`, "gu"),
      ];
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
          observations.push({
            age: match[1],
            sceneId: scene.id,
            quote: excerpt(text, match.index ?? 0, match[0].length),
          });
        }
      }
    }
    const distinctAges = Array.from(new Set(observations.map((item) => item.age)));
    const ageKey = characterAgeKey(entity);
    const storedAge = ageKey ? entity.attributes[ageKey].match(/\d{1,3}/)?.[0] ?? "" : "";
    if (distinctAges.length > 1 || (storedAge && distinctAges.some((age) => age !== storedAge))) {
      findings.push(finding({
        fingerprint: `age-conflict:${entity.id}:${[storedAge, ...distinctAges].filter(Boolean).sort().join("-")}`,
        kind: "consistency",
        severity: "error",
        targetType: "entity",
        targetId: entity.id,
        title: `${entity.name}的年齡可能矛盾`,
        explanation: `目前找到的年齡值為 ${[storedAge, ...distinctAges].filter(Boolean).join("、")} 歲。`,
        suggestion: "核對故事時間、生日與正文敘述後，再決定正確年齡。",
        evidence: observations.map(({ sceneId, quote }) => ({ sceneId, quote })),
      }, detectedAt));
    } else if (!storedAge && distinctAges.length === 1) {
      const age = distinctAges[0];
      findings.push(finding({
        fingerprint: `age-fact:${entity.id}:${age}`,
        kind: "fact",
        severity: "info",
        targetType: "entity",
        targetId: entity.id,
        title: `${entity.name}的年齡候選`,
        explanation: `正文提到 ${entity.name} 為 ${age} 歲，世界觀資料尚未保存這項事實。`,
        suggestion: `將人物屬性「年齡」設為「${age} 歲」。`,
        evidence: observations.map(({ sceneId, quote }) => ({ sceneId, quote })),
        action: { type: "set-entity-attribute", key: "年齡", value: `${age} 歲`, entityId: entity.id, sceneId: "" },
      }, detectedAt));
    }
  }

  const nameOwners = new Map<string, StoryEntity[]>();
  for (const entity of project.entities) {
    for (const name of [entity.name, ...entity.aliases]) {
      const normalized = name.trim().toLocaleLowerCase("zh-TW");
      if (!normalized) continue;
      nameOwners.set(normalized, [...(nameOwners.get(normalized) ?? []), entity]);
    }
  }
  for (const [name, owners] of nameOwners) {
    const distinct = Array.from(new Map(owners.map((owner) => [owner.id, owner])).values());
    if (distinct.length < 2) continue;
    findings.push(finding({
      fingerprint: `duplicate-name:${name}:${distinct.map((item) => item.id).sort().join(":")}`,
      kind: "consistency",
      severity: "warning",
      targetType: "project",
      targetId: project.id,
      title: `名稱「${name}」指向多筆資料`,
      explanation: distinct.map((item) => `${item.name}（${item.type}）`).join("、"),
      suggestion: "調整別名或合併重複資料，避免本文提及連到錯誤項目。",
    }, detectedAt));
  }

  return findings.sort((left, right) => {
    const rank = { error: 0, warning: 1, info: 2 };
    return rank[left.severity] - rank[right.severity] || left.title.localeCompare(right.title, "zh-TW");
  });
}

export function mergeAiFindings(
  existing: AiFinding[],
  detected: AiFinding[],
): AiFinding[] {
  const reviewed = existing.filter((item) => item.status !== "pending");
  const reviewedFingerprints = new Set(reviewed.map((item) => item.fingerprint));
  return [
    ...detected.filter((item) => !reviewedFingerprints.has(item.fingerprint)),
    ...reviewed,
  ];
}
