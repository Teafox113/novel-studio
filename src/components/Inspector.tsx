import { useEffect, useState } from "react";
import { BookOpenText, MapPin, Tags, Target, UserRound } from "lucide-react";
import type {
  DraftStatus,
  EntityLinkRole,
  ProjectNode,
  StoryEntity,
} from "../domain/models";

interface InspectorProps {
  node: ProjectNode;
  entities: StoryEntity[];
  povEntityId: string;
  locationEntityId: string;
  tagNames: string[];
  onChange: (patch: Partial<ProjectNode>) => void;
  onEntityChange: (role: EntityLinkRole, entityId: string) => void;
  onTagsChange: (names: string[]) => void;
}

const statuses: DraftStatus[] = ["構思", "草稿", "修訂", "完成"];

export function Inspector({
  node,
  entities,
  povEntityId,
  locationEntityId,
  tagNames,
  onChange,
  onEntityChange,
  onTagsChange,
}: InspectorProps) {
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setTagDraft(tagNames.join("、"));
  }, [node.id, tagNames]);

  const commitTags = () => {
    onTagsChange(
      tagDraft
        .split(/[、,，]/)
        .map((name) => name.trim())
        .filter(Boolean),
    );
  };

  return (
    <aside className="inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">INSPECTOR</span>
          <h2>場景資料</h2>
        </div>
      </div>

      <section className="inspector-section">
        <label>摘要</label>
        <textarea
          value={node.synopsis}
          placeholder="這個場景發生了什麼？"
          onChange={(event) => onChange({ synopsis: event.target.value })}
        />
      </section>

      <section className="inspector-section metadata-list">
        <label>
          <UserRound size={14} />
          視角人物
        </label>
        <select
          value={povEntityId}
          onChange={(event) => onEntityChange("pov", event.target.value)}
        >
          <option value="">未設定</option>
          {entities
            .filter((entity) => entity.type === "character")
            .map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
        </select>

        <label>
          <MapPin size={14} />
          地點
        </label>
        <select
          value={locationEntityId}
          onChange={(event) => onEntityChange("location", event.target.value)}
        >
          <option value="">未設定</option>
          {entities
            .filter((entity) => entity.type === "location")
            .map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
        </select>

        <label>
          <BookOpenText size={14} />
          狀態
        </label>
        <select
          value={node.status}
          onChange={(event) =>
            onChange({ status: event.target.value as DraftStatus })
          }
        >
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <label>
          <Target size={14} />
          目標字數
        </label>
        <input
          type="number"
          min={0}
          step={100}
          value={node.targetWords ?? 0}
          onChange={(event) =>
            onChange({ targetWords: Number(event.target.value) })
          }
        />
      </section>

      <section className="inspector-section">
        <label>
          <Tags size={14} />
          場景標籤
        </label>
        <input
          value={tagDraft}
          placeholder="主線、伏筆、感情線"
          onChange={(event) => setTagDraft(event.target.value)}
          onBlur={commitTags}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTags();
            }
          }}
        />
        <div className="inspector-tag-list">
          {tagNames.map((name) => (
            <span key={name}>#{name}</span>
          ))}
        </div>
      </section>

      <section className="inspector-section">
        <div className="progress-label">
          <label>場景進度</label>
          <span>
            {node.wordCount.toLocaleString()} /{" "}
            {(node.targetWords ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="inspector-progress">
          <span
            style={{
              width: `${Math.min(
                100,
                (node.wordCount / Math.max(node.targetWords ?? 1, 1)) * 100,
              )}%`,
            }}
          />
        </div>
      </section>

      <section className="inspector-section entity-links">
        <label>本文連結</label>
        {entities
          .filter(
            (entity) =>
              entity.id === povEntityId || entity.id === locationEntityId,
          )
          .map((entity) => (
            <button key={entity.id}>
              <span
                className="entity-avatar"
                style={{ background: entity.color }}
              >
                {entity.name.slice(0, 1)}
              </span>
              {entity.name}
            </button>
          ))}
      </section>
    </aside>
  );
}
