import type { ProjectNode } from "../domain/models";

interface OutlinerProps {
  scenes: ProjectNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function Outliner({
  scenes,
  selectedId,
  onSelect,
}: OutlinerProps) {
  return (
    <div className="outliner">
      <div className="view-intro">
        <span className="eyebrow">OUTLINER</span>
        <h1>場景大綱</h1>
        <p>一次比較所有場景的狀態與結構資料。</p>
      </div>
      <div className="outline-table-wrap">
        <table className="outline-table">
          <thead>
            <tr>
              <th>場景</th>
              <th>視角</th>
              <th>地點</th>
              <th>狀態</th>
              <th>字數</th>
              <th>進度</th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene) => {
              const progress = Math.min(
                100,
                Math.round(
                  (scene.wordCount / Math.max(scene.targetWords ?? 1, 1)) * 100,
                ),
              );
              return (
                <tr
                  key={scene.id}
                  className={selectedId === scene.id ? "selected" : ""}
                  onClick={() => onSelect(scene.id)}
                >
                  <td>
                    <strong>{scene.title}</strong>
                    <small>{scene.synopsis}</small>
                  </td>
                  <td>{scene.pov ?? "—"}</td>
                  <td>{scene.location ?? "—"}</td>
                  <td>
                    <span className={`status-pill status-${scene.status}`}>
                      {scene.status}
                    </span>
                  </td>
                  <td>{scene.wordCount.toLocaleString()}</td>
                  <td>
                    <div className="table-progress">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <small>{progress}%</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
