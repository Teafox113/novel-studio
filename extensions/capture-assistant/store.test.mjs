import { test } from "vitest";
import assert from "node:assert/strict";
import { appendEntry, createEntry, exportCollection } from "./store.js";
test("stores exact quote text and source in the desktop interchange format", () => {
  const entry = createEntry({ kind: "quote", text: "<script>只是文字</script>", url: "https://example.com", title: "資料" });
  const collection = JSON.parse(exportCollection(appendEntry([], entry)));
  assert.equal(collection.version, 1);
  assert.equal(collection.entries[0].text, "<script>只是文字</script>");
  assert.equal(collection.entries[0].url, "https://example.com");
});
test("rejects unsafe sources and oversized content without truncating text", () => {
  for (const input of [{ kind: "quote", text: "a", url: "javascript:alert(1)" }, { kind: "quote", text: "a" }, { kind: "note", text: "x".repeat(20001) }, { kind: "note", text: " " }]) assert.throws(() => createEntry(input));
});
test("capacity failures leave existing data intact", () => {
  const entry = createEntry({ kind: "note", text: "test" });
  const full = Array(200).fill(entry);
  assert.throws(() => appendEntry(full, entry)); assert.equal(full.length, 200);
  assert.throws(() => appendEntry(Array(100).fill({ ...entry, text: "字".repeat(20000) }), entry));
});
