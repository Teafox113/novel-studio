import { exportCollection } from "./store.js";
const $ = id => document.getElementById(id);
let entries = [];
let busy = false;
let draftTouched = false;
function status(text) { $("status").textContent = text; }
async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || "無法連線至收集助手，請重新開啟。");
  entries = result.entries;
  render();
  return result;
}
function render() {
  $("count").textContent = String(entries.length);
  $("export").disabled = !entries.length || busy;
  const query = $("search").value.trim().toLocaleLowerCase();
  const matches = entries.filter(e => [e.title, e.text, e.url, e.note].join("\n").toLocaleLowerCase().includes(query));
  $("entries").replaceChildren();
  for (const entry of [...matches].reverse()) {
    const card = document.createElement("article");
    const type = document.createElement("small"); type.textContent = entry.kind === "quote" ? "網頁摘錄 → 研究素材" : "隨手筆記 → 便條紙";
    const title = document.createElement("h3"); title.textContent = entry.title;
    const body = document.createElement("p"); body.textContent = entry.text;
    const source = document.createElement("small"); source.textContent = entry.url || "沒有附加網頁來源";
    const remove = document.createElement("button"); remove.textContent = "刪除"; remove.disabled = busy;
    remove.setAttribute("aria-label", `刪除：${entry.title}`);
    remove.addEventListener("click", async () => {
      if (!confirm(`刪除「${entry.title}」？\n這會移除收集匣中的內容。請先確認已匯出或匯入 Novel Studio。`)) return;
      await perform(async () => { await request({ action: "remove", id: entry.id }); status("已刪除收集匣中的素材。"); });
    });
    card.append(type, title, body, source, remove); $("entries").append(card);
  }
  if (!matches.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = entries.length ? "沒有符合的素材，試試其他關鍵字。" : "素材匣是空的。先記一張便條，或到網頁反白收集。"; $("entries").append(empty); }
}
async function perform(action) {
  if (busy) return;
  busy = true; $("save").disabled = true; render();
  $("note").disabled = true; $("include-source").disabled = true;
  try { await action(); } catch (error) { status(error.message); }
  finally { busy = false; $("save").disabled = false; $("note").disabled = false; $("include-source").disabled = false; render(); }
}
$("note-form").addEventListener("submit", event => {
  event.preventDefault();
  void perform(async () => {
    let url = "";
    if ($("include-source").checked) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !/^https?:\/\//i.test(tab.url)) throw new Error("目前頁面無法附上來源；請切換至一般網頁，或取消勾選來源。");
      url = tab.url;
    }
    await request({ action: "add", entry: { kind: "note", text: $("note").value, url, note: "" } });
    $("note").value = "";
    await saveDraft();
    status("已收好，儲存在這台電腦。輸入下一個靈感吧。");
  });
});
async function saveDraft() {
  draftTouched = true;
  const result = await chrome.runtime.sendMessage({ action: "draft", text: $("note").value, includeSource: $("include-source").checked });
  if (!result?.ok) throw new Error(result?.error || "草稿未儲存，請先複製文字保留。");
}
for (const id of ["note", "include-source"]) $(id).addEventListener("input", () => {
  void saveDraft().catch(error => status(error.message));
});
$("search").addEventListener("input", render);
$("export").addEventListener("click", () => {
  if (!entries.length) return;
  const url = URL.createObjectURL(new Blob([exportCollection(entries)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Novel-Studio-Captures-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  status("已送出下載；請確認檔案已儲存。收集匣的原始內容仍保留。");
});
void request({ action: "list" }).then(state => {
  if (!draftTouched) { $("note").value = state.draft.text; $("include-source").checked = state.draft.includeSource; }
  if (state.lastError) status(`上次收集未成功：${state.lastError}`);
}).catch(error => status(error.message));
