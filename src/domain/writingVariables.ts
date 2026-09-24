import type { RichTextNode } from "./models";
export const variableKinds = { pending: "稍後設定", item: "物品", knowledge: "資訊", number: "數值", state: "狀態" } as const;
export interface VariableSource { id: string; documentId: string; sceneId: string; quote: string; context: string }
export interface WritingVariable {
  id: string; name: string; kind: keyof typeof variableKinds; ownerId: string;
  initial: number; notes: string; status: "pending" | "ready"; sources: VariableSource[];
}
export function validateWritingVariables(value: unknown): WritingVariable[] {
  if (!Array.isArray(value)) throw new Error("變數庫格式不正確。");
  const ids = new Set<string>(), sources = new Set<string>();
  for (const v of value as WritingVariable[]) {
    if (!v || typeof v.id !== "string" || !v.id || ids.has(v.id) || typeof v.name !== "string" || !v.name.trim() || !Object.hasOwn(variableKinds, v.kind) || typeof v.ownerId !== "string" || typeof v.notes !== "string" || !["pending", "ready"].includes(v.status) || !Number.isFinite(v.initial) || !Array.isArray(v.sources)
      || (v.status === "ready" && v.kind === "pending") || (v.kind === "item" && (!Number.isInteger(v.initial) || v.initial < 0)) || (["knowledge", "state"].includes(v.kind) && ![0, 1].includes(v.initial))) throw new Error("請檢查變數名稱、類型與初始值；物品數量須為非負整數。");
    ids.add(v.id);
    for (const s of v.sources) {
      if (!s || ![s.id, s.documentId, s.sceneId, s.quote, s.context].every(x => typeof x === "string") || !s.id || sources.has(s.id)) throw new Error("變數來源格式不正確。");
      sources.add(s.id);
    }
  }
  return structuredClone(value);
}
export function collectVariable(variables: WritingVariable[], name: string, source: VariableSource, existingId?: string): { variables: WritingVariable[]; variableId: string } {
  const clean = name.trim();
  if (!clean) throw new Error("請先反白關鍵詞。");
  const existing = existingId ? variables.find(v => v.id === existingId) : variables.find(v => v.name.trim() === clean);
  if (existingId && !existing) throw new Error("找不到指定變數。");
  const variableId = existing?.id ?? crypto.randomUUID();
  const next: WritingVariable = existing ? { ...existing, sources: existing.sources.some(s => s.id === source.id) ? existing.sources : [...existing.sources, source] } : { id: variableId, name: clean, kind: "pending", ownerId: "", initial: 0, notes: "", status: "pending", sources: [source] };
  return { variableId, variables: existing ? variables.map(v => v.id === variableId ? next : v) : [...variables, next] };
}
/** Marks travel with the text; missing marks are reported, never guessed from duplicate words. */
export function sourceText(node: RichTextNode, sourceId: string): string {
  const own = node.marks?.some(m => m.type === "variableReference" && m.attrs?.sourceId === sourceId) ? node.text ?? "" : "";
  return own + (node.content ?? []).map(n => sourceText(n, sourceId)).join("");
}
