import { countWords } from "../domain/project";
import { Mark } from "@tiptap/core";
import { createPortal } from "react-dom";
import type { WritingVariable, VariableSource } from "../domain/writingVariables";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import type { RichTextDocument } from "../domain/models";

const VariableReference = Mark.create({
  name: "variableReference", inclusive: false,
  addAttributes() { return { variableId: { default: "" }, sourceId: { default: "" } }; },
  parseHTML() { return [{ tag: "span[data-variable-reference]", getAttrs: el => ({ variableId: el.getAttribute("data-variable-id"), sourceId: el.getAttribute("data-source-id") }) }]; },
  renderHTML({ mark }) { return ["span", { "data-variable-reference": "", "data-variable-id": mark.attrs.variableId, "data-source-id": mark.attrs.sourceId }, 0]; },
});
interface StoryEditorProps {
  sceneId: string;
  variables: WritingVariable[];
  focusSourceId?: string;
  onCollectVariable: (name: string, source: VariableSource, existingId?: string) => string;
  onOpenVariables: (id?: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  typewriter?: boolean;
  documentId: string;
  content: RichTextDocument;
  onChange: (content: RichTextDocument, plainText: string) => void;
}

export function StoryEditor({
  sceneId, variables, focusSourceId, onCollectVariable, onOpenVariables,
  documentId,
  content,
  onChange,
  typewriter = false,
  fontSize, onFontSizeChange,
}: StoryEditorProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; from: number; to: number; text: string; linkedId: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [showMarks, setShowMarks] = useState(true);
  const [lineHeight, setLineHeight] = useState(() => { try { const v = Number(localStorage.getItem("novel-studio:line-height")); return [1.6, 1.8, 2, 2.3, 2.6].includes(v) ? v : 2; } catch { return 2; } });
  const [spellcheck, setSpellcheck] = useState(() => { try { return localStorage.getItem("novel-studio:spellcheck") !== "false"; } catch { return true; } });
  const [selectedWords, setSelectedWords] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const editor = useEditor(
    {
      extensions: [StarterKit, VariableReference],
      content,
      editorProps: {
        attributes: {
          class: "story-prose",
          spellcheck: String(spellcheck),
          role: "textbox",
          "aria-label": "小說正文",
          "aria-multiline": "true",
        },
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        const { from, to } = currentEditor.state.selection;
        setSelectedWords(countWords(currentEditor.state.doc.textBetween(from, to, " ")));
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChange(
          currentEditor.getJSON() as RichTextDocument,
          currentEditor.getText({ blockSeparator: "\n" }),
        );
      },
    },
    [documentId],
  );

  useEffect(() => {
    try { localStorage.setItem("novel-studio:line-height", String(lineHeight)); localStorage.setItem("novel-studio:spellcheck", String(spellcheck)); } catch { /* Optional display settings must not interrupt writing. */ }
    editor?.view.dom.setAttribute("spellcheck", String(spellcheck));
  }, [editor, lineHeight, spellcheck]);

  useEffect(() => {
    if (!editor || !typewriter) return;
    let frame = 0;
    const center = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed || !editor.isFocused || editor.view.composing || !editor.state.selection.empty) return;
        const scroller = editor.view.dom.closest(".editor-view");
        if (!scroller) return;
        const caret = editor.view.coordsAtPos(editor.state.selection.head);
        const bounds = scroller.getBoundingClientRect();
        const zoom = bounds.height / (scroller as HTMLElement).offsetHeight;
        scroller.scrollTop += (caret.top - bounds.top - bounds.height * 0.42) / (zoom || 1);
      });
    };
    editor.on("selectionUpdate", center);
    editor.on("update", center);
    editor.view.dom.addEventListener("compositionend", center);
    editor.commands.focus();
    center();
    return () => {
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", center);
      editor.off("update", center);
      editor.view.dom.removeEventListener("compositionend", center);
    };
  }, [editor, typewriter]);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.isComposing) { e.preventDefault(); e.stopPropagation(); setMenu(null); editor?.commands.focus(); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [menu, editor]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!editor || !focusSourceId) return;
    let from = -1, to = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.marks.some(m => m.type.name === "variableReference" && m.attrs.sourceId === focusSourceId)) { if (from < 0) from = pos; to = pos + node.nodeSize; }
    });
    if (from >= 0) editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
  }, [editor, focusSourceId]);
    if (!editor) return <div className="editor-loading">載入編輯器…</div>;
  const openMenu = (x: number, y: number) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    const linkedId = editor.getAttributes("variableReference").variableId ?? "";
    if (!text.trim() && !linkedId) return false;
    setLinkQuery(""); setMenu({ x: Math.max(8, Math.min(x, window.innerWidth - 320)), y: Math.max(8, Math.min(y, window.innerHeight - 400)), from, to, text, linkedId }); return true;
  };
  const collect = (existingId?: string) => {
    if (!menu || !menu.text.trim()) return;
    const sourceId = crypto.randomUUID();
    const context = editor.state.doc.textBetween(Math.max(0, menu.from - 50), Math.min(editor.state.doc.content.size, menu.to + 50), " ");
    const id = onCollectVariable(menu.text, { id: sourceId, sceneId, documentId, quote: menu.text, context }, existingId);
    editor.chain().focus().setTextSelection({ from: menu.from, to: menu.to }).setMark("variableReference", { variableId: id, sourceId }).setTextSelection(menu.to).run();
    setMenu(null); setNotice("已加入變數庫，可稍後設定。");
  };


  const tools = [
    {
      label: "復原",
      icon: Undo2,
      active: false,
      action: () => editor.chain().focus().undo().run(),
    },
    {
      label: "重做",
      icon: Redo2,
      active: false,
      action: () => editor.chain().focus().redo().run(),
    },
    {
      label: "粗體",
      icon: Bold,
      active: editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "斜體",
      icon: Italic,
      active: editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "小標題",
      icon: Heading2,
      active: editor.isActive("heading", { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "項目清單",
      icon: List,
      active: editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "編號清單",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "引言",
      icon: Quote,
      active: editor.isActive("blockquote"),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div style={{ "--writing-line-height": lineHeight } as CSSProperties} className={`story-editor ${showMarks ? "show-variable-marks" : ""}`} onContextMenu={e => { if ((e.target as HTMLElement).closest(".story-prose") && openMenu(e.clientX, e.clientY)) e.preventDefault(); }} onKeyDown={e => { if (!e.nativeEvent.isComposing && e.shiftKey && e.key === "F10") { const c = editor.view.coordsAtPos(editor.state.selection.from); if(openMenu(c.left, c.bottom)) e.preventDefault(); } }}>
      <div className="variable-capture-tools"><button onClick={() => onOpenVariables()}>變數庫（待設定 {variables.filter(v => v.status === "pending").length}）</button><label><input type="checkbox" checked={showMarks} onChange={e => setShowMarks(e.target.checked)} />顯示變數標記</label><span role="status">{notice}</span></div>
      <label className="manuscript-size-control">正文字級
        <select aria-label="寫作區正文字級" value={fontSize} onChange={e => onFontSizeChange(Number(e.target.value))}>{Array.from({ length: 22 }, (_, i) => i + 15).map(size => <option key={size} value={size}>{size}px</option>)}</select>
      </label>
      <div className="writing-comfort"><details><summary>書寫設定</summary><label>行距<select aria-label="正文行距" value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))}>{[1.6, 1.8, 2, 2.3, 2.6].map(v => <option key={v} value={v}>{v} 倍</option>)}</select></label><label><input type="checkbox" checked={spellcheck} onChange={e => setSpellcheck(e.target.checked)} />拼字檢查</label><small>僅調整閱讀顯示，不改變匯出格式。Ctrl+B 粗體 · Ctrl+I 斜體 · Ctrl+Z 復原 · Ctrl+Shift+V 純文字貼上</small></details><span>{selectedWords > 0 ? `已選取 ${selectedWords} 字／詞` : "中文按字、英文按詞計數"}</span></div>
      <div className="format-toolbar" role="toolbar" aria-label="正文格式">
        {tools.map(({ label, icon: Icon, active, action }, index) => (
          <button
            key={label}
            className={`${active ? "active" : ""} ${index === 2 ? "tool-separator" : ""}`}
            title={label + ({ 復原: " · Ctrl+Z", 重做: " · Ctrl+Shift+Z", 粗體: " · Ctrl+B", 斜體: " · Ctrl+I" }[label] ?? "")}
            aria-label={label}
            aria-pressed={index >= 2 ? active : undefined}
            disabled={index === 0 ? !editor.can().undo() : index === 1 ? !editor.can().redo() : false}
            onMouseDown={e => e.preventDefault()}
            onClick={action}
            type="button"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      {menu && createPortal(<div className="variable-context-menu" ref={menuRef} style={{ left: menu.x, top: menu.y }} role="dialog" aria-label="關鍵詞選單">
        <strong>{menu.text.slice(0, 40) || "已連結文字"}</strong>
        {menu.linkedId && variables.some(v => v.id === menu.linkedId) ? <button onClick={() => { onOpenVariables(menu.linkedId); setMenu(null); }}>查看變數</button> : <button disabled={!menu.text.trim()} onClick={() => collect()}>加入互動變數</button>}
        <details><summary>連結既有變數</summary><input aria-label="搜尋既有變數" placeholder="搜尋名稱…" value={linkQuery} onChange={e => setLinkQuery(e.target.value)} />{variables.filter(v => v.name.includes(linkQuery)).map(v => <button key={v.id} disabled={!menu.text.trim()} onClick={() => collect(v.id)}>{v.name}</button>)}{!variables.length && <small>尚無既有變數</small>}</details>
        <button onClick={() => { setMenu(null); editor.commands.focus(); }}>取消</button>
      </div>, document.body)}
    </div>
  );
}
