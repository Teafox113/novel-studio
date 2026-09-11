import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Fingerprint,
  Info,
  Link2,
  ListChecks,
  MapPin,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRoundSearch,
  X,
} from "lucide-react";
import type {
  AiFinding,
  AiFindingKind,
  AiFindingStatus,
  StoryProject,
} from "../domain/models";

const kindLabels: Record<AiFindingKind, string> = {
  summary: "摘要候選",
  fact: "人物事實",
  consistency: "一致性",
  "missing-link": "本文提及",
  "missing-metadata": "資料缺漏",
};

const kindIcons: Record<AiFindingKind, typeof FileText> = {
  summary: FileText,
  fact: UserRoundSearch,
  consistency: AlertTriangle,
  "missing-link": Link2,
  "missing-metadata": ListChecks,
};

const severityLabels = { info: "建議", warning: "注意", error: "矛盾" } as const;

interface AiWorkspaceProps {
  project: StoryProject;
  scanning: boolean;
  onScan: () => void;
  onAccept: (finding: AiFinding) => void;
  onDismiss: (finding: AiFinding) => void;
  onOpenTarget: (finding: AiFinding) => void;
  onOpenScene: (sceneId: string) => void;
}

export function AiWorkspace({
  project,
  scanning,
  onScan,
  onAccept,
  onDismiss,
  onOpenTarget,
  onOpenScene,
}: AiWorkspaceProps) {
  const [status, setStatus] = useState<AiFindingStatus | "all">("pending");
  const [kind, setKind] = useState<AiFindingKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(project.aiFindings[0]?.id ?? "");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-TW");
    return project.aiFindings.filter((finding) => {
      if (status !== "all" && finding.status !== status) return false;
      if (kind !== "all" && finding.kind !== kind) return false;
      if (!normalized) return true;
      return [finding.title, finding.explanation, finding.suggestion]
        .join(" ")
        .toLocaleLowerCase("zh-TW")
        .includes(normalized);
    });
  }, [kind, project.aiFindings, query, status]);
  const selected = project.aiFindings.find((finding) => finding.id === selectedId);
  const pending = project.aiFindings.filter((finding) => finding.status === "pending");
  const stats = {
    errors: pending.filter((finding) => finding.severity === "error").length,
    warnings: pending.filter((finding) => finding.severity === "warning").length,
    suggestions: pending.filter((finding) => finding.severity === "info").length,
    reviewed: project.aiFindings.filter((finding) => finding.status !== "pending").length,
  };

  useEffect(() => {
    if (!selected && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  const canApply = selected && selected.action.type !== "none";

  return (
    <div className="ai-workspace">
      <aside className="ai-sidebar">
        <header>
          <div><span className="eyebrow">LOCAL REVIEW</span><h1>AI 協作中心</h1></div>
          <span className="ai-local-badge"><ShieldCheck size={12} />本機</span>
        </header>

        <button className="ai-scan-button" onClick={onScan} disabled={scanning}>
          {scanning ? <RefreshCw className="spinning" size={15} /> : <Play size={15} />}
          <span><strong>{scanning ? "正在分析…" : project.aiFindings.length ? "重新掃描專案" : "開始本機分析"}</strong><small>不會將小說傳送到網路</small></span>
        </button>

        <div className="ai-overview">
          <StatButton icon={<CircleAlert size={14} />} label="矛盾" count={stats.errors} tone="error" onClick={() => { setStatus("pending"); setKind("consistency"); }} />
          <StatButton icon={<AlertTriangle size={14} />} label="注意" count={stats.warnings} tone="warning" onClick={() => { setStatus("pending"); setKind("all"); }} />
          <StatButton icon={<Sparkles size={14} />} label="建議" count={stats.suggestions} tone="info" onClick={() => { setStatus("pending"); setKind("all"); }} />
          <StatButton icon={<CheckCircle2 size={14} />} label="已審核" count={stats.reviewed} tone="reviewed" onClick={() => { setStatus("all"); setKind("all"); }} />
        </div>

        <section className="ai-privacy-note">
          <BrainCircuit size={16} />
          <p><strong>規則式本機分析</strong>目前使用結構化資料與正文規則找候選，不使用雲端模型。未來接入模型時仍會先顯示送出範圍。</p>
        </section>
      </aside>

      <main className="ai-review-list">
        <header className="ai-review-toolbar">
          <div className="ai-status-tabs">
            <button className={status === "pending" ? "active" : ""} onClick={() => setStatus("pending")}>待審核 <span>{pending.length}</span></button>
            <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>全部 <span>{project.aiFindings.length}</span></button>
          </div>
          <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋分析結果…" /></label>
        </header>

        <div className="ai-kind-filters">
          <button className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>全部</button>
          {Object.entries(kindLabels).map(([value, label]) => <button key={value} className={kind === value ? "active" : ""} onClick={() => setKind(value as AiFindingKind)}>{label}</button>)}
        </div>

        <div className="ai-findings">
          {project.aiFindings.length === 0 ? (
            <div className="ai-empty"><Bot size={38} /><h2>尚未分析專案</h2><p>按左側「開始本機分析」，系統只會讀取目前裝置上的小說資料。</p><button onClick={onScan}><Play size={14} />開始分析</button></div>
          ) : filtered.length === 0 ? (
            <div className="ai-empty compact"><CheckCircle2 size={30} /><h2>這個篩選沒有待審核項目</h2><p>可切換到「全部」查看已接受或略過的紀錄。</p></div>
          ) : filtered.map((finding) => {
            const Icon = kindIcons[finding.kind];
            return <article key={finding.id} className={`ai-finding-card ${finding.severity} ${finding.status} ${selectedId === finding.id ? "active" : ""}`} onClick={() => setSelectedId(finding.id)}>
              <span className="ai-finding-icon"><Icon size={16} /></span>
              <div><div className="ai-finding-meta"><span>{kindLabels[finding.kind]}</span><span className={`ai-severity ${finding.severity}`}>{severityLabels[finding.severity]}</span>{finding.status !== "pending" && <span className={`ai-review-state ${finding.status}`}>{finding.status === "accepted" ? "已接受" : "已略過"}</span>}</div><h2>{finding.title}</h2><p>{finding.explanation}</p><small>{finding.evidence.length} 筆證據 · {targetLabel(project, finding)}</small></div>
              <ChevronRight size={15} />
            </article>;
          })}
        </div>
      </main>

      <aside className="ai-detail">
        {selected ? <>
          <header><div><span className="eyebrow">REVIEW ITEM</span><h2>審核建議</h2></div><span className={`ai-severity ${selected.severity}`}>{severityLabels[selected.severity]}</span></header>
          <div className="ai-detail-scroll">
            <div className="ai-detail-kind">{(() => { const Icon = kindIcons[selected.kind]; return <Icon size={15} />; })()}<span>{kindLabels[selected.kind]}</span><small><Fingerprint size={11} />{selected.id}</small></div>
            <h1>{selected.title}</h1>
            <p className="ai-explanation">{selected.explanation}</p>

            <section className="ai-suggestion"><h3><Sparkles size={14} />建議</h3><p>{selected.suggestion}</p></section>

            {selected.action.type !== "none" && <section className="ai-change-preview"><h3>預計變更</h3><div><span>目前</span><p>{currentValue(project, selected) || "（尚未設定）"}</p></div><ArrowRight size={14} /><div className="after"><span>採用後</span><p>{selected.action.value || "建立連結"}</p></div></section>}

            <section className="ai-evidence"><h3>來源證據 <span>{selected.evidence.length}</span></h3>{selected.evidence.length === 0 ? <div className="ai-no-evidence">這是結構化資料缺漏，沒有正文引文。</div> : selected.evidence.map((evidence, index) => <button key={`${evidence.sceneId}-${index}`} onClick={() => onOpenScene(evidence.sceneId)}><span>「{sceneTitle(project, evidence.sceneId)}」</span><p>{evidence.quote}</p><ArrowRight size={12} /></button>)}</section>

            <button className="ai-open-target" onClick={() => onOpenTarget(selected)}><MapPin size={13} />開啟相關資料<ArrowRight size={12} /></button>
          </div>
          <footer>
            {selected.status === "pending" ? <><button className="ai-dismiss" onClick={() => onDismiss(selected)}><X size={14} />略過</button><button className="ai-accept" onClick={() => onAccept(selected)}>{canApply ? <Check size={14} /> : <CheckCircle2 size={14} />}{canApply ? "採用變更" : "完成審閱"}</button></> : <div className={`ai-reviewed-banner ${selected.status}`}><CheckCircle2 size={14} />{selected.status === "accepted" ? "此項已接受" : "此項已略過"}</div>}
          </footer>
        </> : <div className="ai-detail-empty"><Info size={30} /><span>選擇一項分析結果查看證據</span></div>}
      </aside>
    </div>
  );
}

function StatButton({ icon, label, count, tone, onClick }: { icon: React.ReactNode; label: string; count: number; tone: string; onClick: () => void }) {
  return <button className={tone} onClick={onClick}>{icon}<span>{label}</span><strong>{count}</strong></button>;
}

function sceneTitle(project: StoryProject, id: string): string {
  return project.nodes.find((node) => node.id === id)?.title ?? "未知場景";
}

function targetLabel(project: StoryProject, finding: AiFinding): string {
  if (finding.targetType === "scene") return sceneTitle(project, finding.targetId);
  if (finding.targetType === "entity") return project.entities.find((item) => item.id === finding.targetId)?.name ?? "世界觀";
  if (finding.targetType === "timeline") return project.timelineEvents.find((item) => item.id === finding.targetId)?.title ?? "時間線";
  return project.title;
}

function currentValue(project: StoryProject, finding: AiFinding): string {
  if (finding.action.type === "set-scene-synopsis") return project.nodes.find((node) => node.id === finding.action.sceneId)?.synopsis ?? "";
  if (finding.action.type === "set-entity-attribute") return project.entities.find((entity) => entity.id === finding.action.entityId)?.attributes[finding.action.key] ?? "";
  if (finding.action.type === "add-scene-entity-link") return "尚未連結";
  return "";
}
