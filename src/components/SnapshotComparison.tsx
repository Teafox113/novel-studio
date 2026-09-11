import { useMemo } from "react";
import type { ProjectSnapshot, StoryProject } from "../domain/models";
import { compareProjectVersions } from "../domain/snapshotComparison";

export function SnapshotComparison({ snapshot, project, onClose }: { snapshot: ProjectSnapshot; project: StoryProject; onClose: () => void }) {
  const changes = useMemo(() => compareProjectVersions(snapshot.project, project), [snapshot.project, project]);
  return <section className="snapshot-comparison" aria-label="版本比較">
    <div className="comparison-heading"><h3>與目前版本比較</h3><button onClick={onClose}>收起比較</button></div>
    <p>基準：{snapshot.label} → 目前編輯內容。新增／刪除均以目前版本為準。</p>
    <p role="status">{changes.length ? `新增 ${changes.filter(c => c.kind === "新增").length} · 刪除 ${changes.filter(c => c.kind === "刪除").length} · 修改 ${changes.filter(c => c.kind === "修改").length}` : "內容相同，沒有變更。"}</p>
    {changes.map((change, index) => <details key={index}>
      <summary>{change.kind} · {change.category} · {change.title}</summary>
      {change.fields.map((field, fieldIndex) => <div className="comparison-field" key={fieldIndex}>
        <strong>{field.name}</strong><div className="comparison-values">
          <div><span>備份版本</span><pre>{field.before || "（空白）"}</pre></div>
          <div><span>目前版本</span><pre>{field.after || "（空白）"}</pre></div>
        </div>
      </div>)}
    </details>)}
  </section>;
}
