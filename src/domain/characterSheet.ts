export const characterCategories = { identity: "身分", condition: "身體狀態", item: "背包", knowledge: "已知資訊", ability: "能力", stat: "數值" } as const;
export type CharacterCategory = keyof typeof characterCategories;
export interface CharacterKeyword {
  id: string;
  category: CharacterCategory;
  name: string;
  value: number;
  maximum?: number;
  notes: string;
  entityId: string;
  sourceSceneId: string;
}
export interface CharacterSheet { version: 1; entries: CharacterKeyword[] }
export function validateCharacterSheet(value: unknown): CharacterSheet {
  const sheet = value as CharacterSheet;
  if (!sheet || sheet.version !== 1 || !Array.isArray(sheet.entries)) throw new Error("人物狀態卡格式不正確。");
  const ids = new Set<string>();
  for (const e of sheet.entries) {
    if (!e || typeof e.id !== "string" || !e.id || ids.has(e.id) || !Object.hasOwn(characterCategories, e.category)
      || typeof e.name !== "string" || !e.name.trim() || !Number.isFinite(e.value)
      || (e.maximum !== undefined && (!Number.isFinite(e.maximum) || e.maximum <= 0 || e.value < 0 || e.value > e.maximum))
      || (e.category === "item" && (!Number.isInteger(e.value) || e.value < 0))
      || typeof e.notes !== "string" || typeof e.entityId !== "string" || typeof e.sourceSceneId !== "string") {
      throw new Error("人物關鍵字需有名稱；數值須有效，物品數量須為非負整數，當前值不可超過上限。");
    }
    ids.add(e.id);
  }
  return structuredClone(sheet);
}
