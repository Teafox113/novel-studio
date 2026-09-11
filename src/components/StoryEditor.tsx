import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
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

interface StoryEditorProps {
  typewriter?: boolean;
  documentId: string;
  content: RichTextDocument;
  onChange: (content: RichTextDocument, plainText: string) => void;
}

export function StoryEditor({
  documentId,
  content,
  onChange,
  typewriter = false,
}: StoryEditorProps) {
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content,
      editorProps: {
        attributes: {
          class: "story-prose",
          spellcheck: "true",
        },
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
    if (!editor || !typewriter) return;
    let frame = 0;
    const center = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed || !editor.isFocused || editor.view.composing) return;
        const scroller = editor.view.dom.closest(".editor-view");
        if (!scroller) return;
        const caret = editor.view.coordsAtPos(editor.state.selection.head);
        const bounds = scroller.getBoundingClientRect();
        scroller.scrollTop += caret.top - bounds.top - bounds.height * 0.42;
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

  if (!editor) return <div className="editor-loading">載入編輯器…</div>;

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
    <div className="story-editor">
      <div className="format-toolbar">
        {tools.map(({ label, icon: Icon, active, action }, index) => (
          <button
            key={label}
            className={`${active ? "active" : ""} ${index === 2 ? "tool-separator" : ""}`}
            title={label}
            aria-label={label}
            onClick={action}
            type="button"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
