import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  Check,
  FileText,
  Globe2,
  Image,
  Lightbulb,
  Link2,
  Paperclip,
  Tags,
} from "lucide-react";
import type {
  InspirationItem,
  ResearchItem,
  StoryEntity,
  StoryTag,
} from "../domain/models";
import { isWebUrl } from "../capture/quickCapture";

interface InspirationEditorProps {
  item: InspirationItem;
  tags: StoryTag[];
  linkedEntities: StoryEntity[];
  availableEntities: StoryEntity[];
  linkedResearch: ResearchItem[];
  onChange: (patch: Partial<InspirationItem>) => void;
  onTagsChange: (names: string[]) => void;
  onLinkEntity: (entityId: string) => void;
  onUnlinkEntity: (entityId: string) => void;
  onConvertToScene: () => void;
  onArchive: () => void;
  onCaptureFiles: (files: File[]) => Promise<void> | void;
  onCaptureUrl: (url: string) => Promise<void> | void;
  onOpenResearch: (researchId: string) => void;
}

const kindOptions: Array<{ value: InspirationItem["kind"]; label: string }> = [
  { value: "plot", label: "劇情構思" },
  { value: "scene", label: "場景草稿" },
  { value: "dialogue", label: "對白" },
  { value: "character", label: "人物" },
  { value: "world", label: "世界觀" },
  { value: "note", label: "隨手筆記" },
];

const statusOptions: Array<{
  value: InspirationItem["status"];
  label: string;
}> = [
  { value: "inbox", label: "待整理" },
  { value: "developing", label: "發展中" },
  { value: "used", label: "已採用" },
];

export function InspirationEditor({
  item,
  tags,
  linkedEntities,
  availableEntities,
  linkedResearch,
  onChange,
  onTagsChange,
  onLinkEntity,
  onUnlinkEntity,
  onConvertToScene,
  onArchive,
  onCaptureFiles,
  onCaptureUrl,
  onOpenResearch,
}: InspirationEditorProps) {
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setTagDraft(tags.map((tag) => tag.name).join("、"));
  }, [item.id, tags]);

  const commitTags = () => {
    onTagsChange(
      tagDraft
        .split(/[、,，]/)
        .map((name) => name.trim())
        .filter(Boolean),
    );
  };

  return (
    <div className="inspiration-workspace">
      <article className="inspiration-paper">
        <header className="inspiration-editor-heading">
          <div className="inspiration-title-row">
            <span className="inspiration-mark">
              <Lightbulb size={18} />
            </span>
            <div>
              <span className="eyebrow">IDEA WORKBENCH</span>
              <input
                value={item.title}
                aria-label="靈感標題"
                placeholder="這個靈感叫什麼？"
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </div>
          </div>
          <div className="inspiration-actions">
            <button onClick={onConvertToScene} className="primary-action">
              轉成場景
              <ArrowRight size={15} />
            </button>
            <button onClick={onArchive} title="封存這則靈感">
              <Archive size={15} />
              封存
            </button>
          </div>
        </header>

        <div className="inspiration-meta-grid">
          <label>
            類型
            <select
              value={item.kind}
              onChange={(event) =>
                onChange({ kind: event.target.value as InspirationItem["kind"] })
              }
            >
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            狀態
            <select
              value={item.status}
              onChange={(event) =>
                onChange({
                  status: event.target.value as InspirationItem["status"],
                })
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="idea-tag-field">
            <span>
              <Tags size={13} />
              標籤
            </span>
            <input
              value={tagDraft}
              placeholder="伏筆、第二部、待查證"
              onChange={(event) => setTagDraft(event.target.value)}
              onBlur={commitTags}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTags();
                }
              }}
            />
          </label>
        </div>

        <label className="inspiration-content-field">
          <span>構思內容</span>
          <textarea
            value={item.content}
            placeholder="先把想到的劇情、畫面、對白或問題記下來，不需要整理完整。"
            onChange={(event) => onChange({ content: event.target.value })}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length > 0) {
                event.preventDefault();
                void onCaptureFiles(files);
                return;
              }
              const pasted = event.clipboardData.getData("text/plain").trim();
              if (isWebUrl(pasted)) void onCaptureUrl(pasted);
            }}
          />
        </label>

        <section className="idea-attachments">
          <div className="idea-section-heading">
            <span><Paperclip size={14} />圖片、網址與研究素材</span>
            <label className="idea-attachment-picker">
              ＋ 貼入附件
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.md,.doc,.docx,.rtf"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) void onCaptureFiles(files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {linkedResearch.length === 0 ? (
            <p>在上方內容直接貼上圖片或網址，素材會自動保存並連結到這則靈感。</p>
          ) : (
            <div className="idea-attachment-grid">
              {linkedResearch.map((research) => (
                <button key={research.id} onClick={() => onOpenResearch(research.id)}>
                  {research.kind === "image" && research.dataUrl ? (
                    <img src={research.dataUrl} alt="" />
                  ) : (
                    <span className={`research-kind-icon ${research.kind}`}>
                      {research.kind === "web" ? <Globe2 size={16} /> : research.kind === "pdf" ? <FileText size={16} /> : <Image size={16} />}
                    </span>
                  )}
                  <span><strong>{research.title}</strong><small>{research.sourceUrl || research.originalFileName || "研究素材"}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="idea-entity-links">
          <div className="idea-section-heading">
            <span>
              <Link2 size={14} />
              相關人物、地點與專有名詞
            </span>
            <select
              value=""
              aria-label="連結世界觀項目"
              onChange={(event) => {
                if (event.target.value) onLinkEntity(event.target.value);
              }}
            >
              <option value="">＋ 連結項目</option>
              {availableEntities
                .filter(
                  (entity) => !item.linkedEntityIds.includes(entity.id),
                )
                .map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="linked-entity-chips">
            {linkedEntities.length === 0 ? (
              <span className="empty-link-copy">
                尚未連結；建立關聯後，AI 才能沿著人物與設定找到這則靈感。
              </span>
            ) : (
              linkedEntities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => onUnlinkEntity(entity.id)}
                  title="按一下移除連結"
                >
                  <span style={{ background: entity.color }} />
                  {entity.name}
                </button>
              ))
            )}
          </div>
        </section>

        <footer className="inspiration-editor-footer">
          <span>
            最後更新：
            {new Intl.DateTimeFormat("zh-TW", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(item.updatedAt))}
          </span>
          {item.status === "used" && (
            <span className="used-badge">
              <Check size={13} />
              已採用到作品
            </span>
          )}
        </footer>
      </article>
    </div>
  );
}
