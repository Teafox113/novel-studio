import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, FileUp, Image, Link2, Sparkles, X } from "lucide-react";

interface QuickCaptureDialogProps {
  onClose: () => void;
  onCaptureText: (text: string) => Promise<void> | void;
  onCaptureFiles: (files: File[]) => Promise<void> | void;
}

export function QuickCaptureDialog({
  onClose,
  onCaptureText,
  onCaptureFiles,
}: QuickCaptureDialogProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => textareaRef.current?.focus(), []);

  const finish = async (action: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const submitText = () => {
    if (!text.trim()) return;
    void finish(() => onCaptureText(text));
  };

  return (
    <div
      className="quick-capture-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`quick-capture-dialog ${dragging ? "dragging" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="快速收集"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submitText();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const files = Array.from(event.dataTransfer.files);
          if (files.length > 0) void finish(() => onCaptureFiles(files));
        }}
      >
        <header>
          <span><ClipboardPaste size={19} /></span>
          <div>
            <strong>快速收集</strong>
            <small>不用先選分類，Novel Studio 會自動放到正確位置</small>
          </div>
          <button onClick={onClose} aria-label="關閉快速收集"><X size={17} /></button>
        </header>

        <textarea
          ref={textareaRef}
          value={text}
          disabled={busy}
          placeholder="直接貼上網址、摘錄、對白或任何剛想到的內容…"
          onChange={(event) => setText(event.target.value)}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files);
            if (files.length === 0) return;
            event.preventDefault();
            void finish(() => onCaptureFiles(files));
          }}
        />

        <div className="quick-capture-routing">
          <span><Link2 size={14} /><b>網址</b>研究素材</span>
          <span><Image size={14} /><b>圖片／PDF</b>研究附件</span>
          <span><Sparkles size={14} /><b>文字</b>靈感收件匣</span>
        </div>

        <footer>
          <label>
            <FileUp size={15} />
            選擇檔案
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.doc,.docx,.rtf"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) void finish(() => onCaptureFiles(files));
              }}
            />
          </label>
          <span>也可以把檔案拖到這裡</span>
          <button disabled={!text.trim() || busy} onClick={submitText}>
            {busy ? "收集中…" : "收進專案"}
          </button>
        </footer>
      </section>
    </div>
  );
}
