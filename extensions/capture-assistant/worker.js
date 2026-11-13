import { appendEntry, createEntry } from "./store.js";

let queue = Promise.resolve();
const serialize = action => {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
};
async function read() {
  const stored = await chrome.storage.local.get(["entries", "lastError", "draft"]);
  return { entries: stored.entries ?? [], lastError: stored.lastError ?? "", draft: stored.draft ?? { text: "", includeSource: false } };
}
async function save(entries) {
  await chrome.storage.local.set({ entries, lastError: "" });
  await chrome.action.setBadgeText({ text: entries.length ? String(entries.length) : "" });
}
async function report(error) {
  const message = error instanceof Error ? error.message : "儲存失敗，請重試。";
  try {
    await chrome.storage.local.set({ lastError: message });
    await chrome.action.setBadgeText({ text: "!" });
  } catch { /* Reply still contains the failure if storage is unavailable. */ }
  return { error: message };
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "capture-selection", title: "收集文字及來源至 Novel Studio 本機素材匣", contexts: ["selection"], documentUrlPatterns: ["http://*/*", "https://*/*"] });
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "capture-selection") return;
  void serialize(async () => {
    try {
      const entry = createEntry({ kind: "quote", title: tab?.title, text: info.selectionText, url: info.frameUrl || info.pageUrl, note: "" });
      await save(appendEntry((await read()).entries, entry));
    } catch (error) { await report(error); }
  });
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  serialize(async () => {
    try {
      const state = await read();
      if (message?.action === "list") return state;
      if (message?.action === "draft") {
        if (typeof message.text !== "string" || message.text.length > 20000) throw new Error("草稿長度超過限制。");
        await chrome.storage.local.set({ draft: { text: message.text, includeSource: message.includeSource === true } });
        return { ok: true };
      }
      if (message?.action === "add") await save(appendEntry(state.entries, createEntry(message.entry)));
      else if (message?.action === "remove") await save(state.entries.filter(entry => entry.id !== message.id));
      else throw new Error("不支援的操作。");
      return await read();
    } catch (error) { return report(error); }
  }).then(reply);
  return true;
});
