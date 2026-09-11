import { ArrowDown, ArrowUp, MapPin, UserRound } from "lucide-react";
import type { ProjectNode } from "../domain/models";

interface CorkboardProps {
  scenes: ProjectNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

export function Corkboard({
  scenes,
  selectedId,
  onSelect,
  onMove,
}: CorkboardProps) {
  return (
    <div className="corkboard">
      <div className="view-intro">
        <span className="eyebrow">CORKBOARD</span>
        <h1>故事卡片</h1>
        <p>快速檢視場景節奏、視角與進度。</p>
      </div>
      <div className="card-grid">
        {scenes.map((scene, index) => (
          <article
            key={scene.id}
            className={`scene-card ${selectedId === scene.id ? "selected" : ""}`}
            onClick={() => onSelect(scene.id)}
          >
            <div className="index-card-top">
              <span className={`status-pill status-${scene.status}`}>
                {scene.status}
              </span>
              <div className="card-actions">
                <button
                  disabled={index === 0}
                  title="向前移動"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(scene.id, -1);
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  disabled={index === scenes.length - 1}
                  title="向後移動"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(scene.id, 1);
                  }}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
            <h3>{scene.title}</h3>
            <p>{scene.synopsis || "尚未填寫場景摘要。"}</p>
            <div className="card-meta">
              <span>
                <UserRound size={13} />
                {scene.pov ?? "未設定"}
              </span>
              <span>
                <MapPin size={13} />
                {scene.location ?? "未設定"}
              </span>
            </div>
            <div className="card-progress">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    (scene.wordCount / (scene.targetWords || 1)) * 100,
                  )}%`,
                }}
              />
            </div>
            <div className="card-word-count">
              {scene.wordCount.toLocaleString()} /{" "}
              {(scene.targetWords ?? 0).toLocaleString()} 字
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
