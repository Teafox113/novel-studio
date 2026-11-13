import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../gaozhi-tokens.css', import.meta.url), 'utf8');
const palettes = [...css.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)].map(match => Object.fromEntries([...match[1].matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]))).filter(p => p['--desk']);
function luminance(hex) { const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x,y) + .05) / (Math.min(x,y) + .05); }
for (const [index, palette] of palettes.entries()) {
  for (const fg of ['--ink', '--ink-2', '--ink-3', '--rule-strong']) for (const bg of ['--desk', '--paper']) {
    test(`${index ? 'dark' : 'light'} ${fg} on ${bg} meets small-text AA`, () => expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5));
  }
  test(`${index ? 'dark' : 'light'} primary action remains readable`, () => expect(contrast(palette['--seal'], palette['--on-seal'])).toBeGreaterThanOrEqual(4.5));
}
test('legacy interface no longer includes sub-13px fixed font sizes', () => {
  const layout = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  expect([...layout.matchAll(/font-size:\s*(\d+)px/g)].filter(m => Number(m[1]) < 13)).toEqual([]);
});
