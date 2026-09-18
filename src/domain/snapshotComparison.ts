import type { StoryProject } from "./models";

export interface VersionChange {
  category: string;
  title: string;
  kind: "新增" | "刪除" | "修改";
  fields: Array<{ name: string; before: string; after: string }>;
}

const ignored = new Set(["updatedAt", "createdAt", "revision", "wordCount"]);
const labels: Record<string, string> = {
  title: "標題", subtitle: "副標題", author: "作者", synopsis: "摘要",
  plainText: "正文", content: "內容／格式", status: "狀態", parentId: "所屬資料夾",
  sortOrder: "排列順序", targetWords: "目標字數", name: "名稱", summary: "摘要",
  dataUrl: "附件", notes: "筆記", attributes: "自訂屬性", characterSheet: "人物狀態卡",
};

function display(value: unknown, key: string): string {
  if (value === undefined) return "（無）";
  if (key === "dataUrl") return value ? "已嵌入附件（檔案內容不同）" : "（無附件）";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

/** Compare backup → current. Timestamps and derived counters are not edits. */
export function compareProjectVersions(before: StoryProject, after: StoryProject): VersionChange[] {
  const changes: VersionChange[] = [];
  function compare(category: string, oldRows: object[], newRows: object[]) {
    const oldMap = new Map(oldRows.map(row => [String((row as { id: string }).id), row as Record<string, unknown>]));
    const newMap = new Map(newRows.map(row => [String((row as { id: string }).id), row as Record<string, unknown>]));
    for (const id of new Set([...oldMap.keys(), ...newMap.keys()])) {
      const oldRow = oldMap.get(id), newRow = newMap.get(id);
      const row = newRow ?? oldRow!;
      const fields = [...new Set([...Object.keys(oldRow ?? {}), ...Object.keys(newRow ?? {})])]
        .filter(key => key !== "id" && !ignored.has(key))
        .filter(key => JSON.stringify(oldRow?.[key]) !== JSON.stringify(newRow?.[key]))
        .map(key => ({ name: labels[key] ?? key, before: display(oldRow?.[key], key), after: display(newRow?.[key], key) }));
      if (fields.length || !oldRow || !newRow) changes.push({ category, title: String(row.title ?? row.name ?? row.label ?? id), kind: !oldRow ? "新增" : !newRow ? "刪除" : "修改", fields });
    }
  }
  compare("專案", [{ id: "metadata", title: before.title, subtitle: before.subtitle, author: before.author }], [{ id: "metadata", title: after.title, subtitle: after.subtitle, author: after.author }]);
  compare("互動書籍", before.interactiveBook ? [{ id: "interactive", title: "分支設定", ...before.interactiveBook }] : [], after.interactiveBook ? [{ id: "interactive", title: "分支設定", ...after.interactiveBook }] : []);
  compare("架空歷史", before.fictionalHistory ? [{ id: "history", title: "曆法與編年", ...before.fictionalHistory }] : [], after.fictionalHistory ? [{ id: "history", title: "曆法與編年", ...after.fictionalHistory }] : []);
  const nodes = (project: StoryProject) => project.nodes.map(node => ({ ...node, plainText: project.documents[node.documentId ?? ""]?.plainText, content: project.documents[node.documentId ?? ""]?.content }));
  compare("手稿", nodes(before), nodes(after));
  const collections = [
    ["世界觀", "entities"], ["關係", "entityRelations"], ["標籤", "tags"],
    ["標籤連結", "tagLinks"], ["場景連結", "sceneEntityLinks"], ["靈感", "inspirations"],
    ["時間線", "timelineEvents"], ["研究素材", "researchItems"], ["AI 審核", "aiFindings"],
  ] as const;
  for (const [category, key] of collections) compare(category, before[key], after[key]);
  return changes;
}
