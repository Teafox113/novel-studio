export const uiScales = [100, 110, 125, 150, 175] as const;
export const fontChoices = {
  system: { label: "系統預設", css: '"Segoe UI", "Microsoft JhengHei", sans-serif' },
  jhenghei: { label: "微軟正黑體", css: '"Microsoft JhengHei", "Noto Sans TC", sans-serif' },
  serif: { label: "明體／宋體", css: '"PMingLiU", "Noto Serif TC", serif' },
  mono: { label: "打字機等寬", css: '"Courier New", "PMingLiU", monospace' },
} as const;
export type FontChoice = keyof typeof fontChoices;
export function readFont(value: string | null, fallback: FontChoice): FontChoice {
  return value && Object.hasOwn(fontChoices, value) ? value as FontChoice : fallback;
}
export function readScale(value: string | null): number {
  const scale = Number(value);
  return uiScales.some(s => s === scale) ? scale : 100;
}
export function readEditorSize(value: string | null): number {
  const size = Number(value);
  return value && Number.isFinite(size) ? Math.min(36, Math.max(15, Math.round(size))) : 20;
}
// The shell uses CSS zoom; compensate only the manuscript typography.
export function manuscriptCssSize(size: number, scale: number): number { return size / (scale / 100); }
