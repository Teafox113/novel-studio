import { test, expect, vi } from "vitest";

test("serializes simultaneous captures and preserves data on storage failure", async () => {
  let messageListener;
  let clickListener;
  let state = { entries: [] };
  let failSave = false;
  vi.stubGlobal("chrome", {
    runtime: { id: "test-extension", onInstalled: { addListener() {} }, onMessage: { addListener(fn) { messageListener = fn; } } },
    contextMenus: { onClicked: { addListener(fn) { clickListener = fn; } } },
    storage: { local: {
      async get() { await new Promise(resolve => setTimeout(resolve, 2)); return structuredClone(state); },
      async set(value) { if (failSave && value.entries) throw new Error("磁碟儲存失敗"); state = { ...state, ...structuredClone(value) }; },
    } },
    action: { async setBadgeText() {} },
  });
  try {
    await import("./worker.js");
    const send = message => new Promise(resolve => messageListener(message, { id: "test-extension" }, resolve));
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => send({ action: "add", entry: { kind: "note", text: `筆記 ${i}` } })));
    expect(results.every(result => !result.error)).toBe(true);
    expect(state.entries).toHaveLength(10);
    clickListener({ menuItemId: "capture-selection", selectionText: "摘錄", pageUrl: "https://example.com" }, { title: "來源" });
    const listed = await send({ action: "list" });
    expect(listed.entries).toHaveLength(11);
    expect(listed.entries.at(-1)).toMatchObject({ kind: "quote", text: "摘錄", url: "https://example.com" });
    failSave = true;
    const rejected = await send({ action: "add", entry: { kind: "note", text: "未成功的筆記" } });
    expect(rejected.error).toContain("儲存失敗");
    expect(state.entries).toHaveLength(11);
    expect((await send({ action: "list" })).lastError).toContain("儲存失敗");
    failSave = false;
    await send({ action: "add", entry: { kind: "note", text: "復原後筆記" } });
    expect(state.entries).toHaveLength(12);
    expect(state.lastError).toBe("");
    await send({ action: "draft", text: "尚未送出的靈感", includeSource: true });
    expect((await send({ action: "list" })).draft).toEqual({ text: "尚未送出的靈感", includeSource: true });
    expect(state.entries).toHaveLength(12);
  } finally { vi.unstubAllGlobals(); }
});
