import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  Clock3,
  GitCompareArrows,
  Link2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";
import type {
  StoryProject,
  TimelineEvent,
  TimelineEventKind,
  TimelineEventStatus,
} from "../domain/models";
import {
  filterTimelineEvents,
  sortTimelineEvents,
  timelineDivergence,
  type TimelineAxis,
} from "../domain/timeline";

const kindLabels: Record<TimelineEventKind, string> = {
  "scene-event": "場景事件",
  backstory: "角色往事",
  historical: "歷史事件",
  "world-event": "世界事件",
};

const statusLabels: Record<TimelineEventStatus, string> = {
  planned: "規劃中",
  confirmed: "已確認",
  uncertain: "待確認",
};

interface TimelineWorkspaceProps {
  project: StoryProject;
  focusedEventId?: string | null;
  onCreateEvent: () => string;
  onPatchEvent: (eventId: string, patch: Partial<TimelineEvent>) => void;
  onMoveEvent: (eventId: string, direction: -1 | 1, axis: TimelineAxis) => void;
  onRemoveEvent: (eventId: string) => void;
  onOpenScene: (sceneId: string) => void;
}

export function TimelineWorkspace({
  project,
  focusedEventId,
  onCreateEvent,
  onPatchEvent,
  onMoveEvent,
  onRemoveEvent,
  onOpenScene,
}: TimelineWorkspaceProps) {
  const [axis, setAxis] = useState<TimelineAxis>("story");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(project.timelineEvents[0]?.id ?? "");
  const [nodeToLink, setNodeToLink] = useState("");
  const [entityToLink, setEntityToLink] = useState("");

  const ordered = useMemo(
    () => sortTimelineEvents(project.timelineEvents, axis),
    [project.timelineEvents, axis],
  );
  const visible = useMemo(
    () => filterTimelineEvents(ordered, query),
    [ordered, query],
  );
  const selected = project.timelineEvents.find((event) => event.id === selectedId);
  const storyPreview = sortTimelineEvents(project.timelineEvents, "story").slice(0, 6);
  const narrativePreview = sortTimelineEvents(project.timelineEvents, "narrative").slice(0, 6);
  const scenes = project.nodes.filter((node) => node.kind === "scene");

  useEffect(() => {
    if (!selected && project.timelineEvents[0]) {
      setSelectedId(project.timelineEvents[0].id);
    }
  }, [project.timelineEvents, selected]);

  useEffect(() => {
    if (
      focusedEventId &&
      project.timelineEvents.some((event) => event.id === focusedEventId)
    ) {
      setSelectedId(focusedEventId);
    }
  }, [focusedEventId, project.timelineEvents]);

  const addEvent = () => {
    const id = onCreateEvent();
    setSelectedId(id);
    setQuery("");
  };

  const linkNode = () => {
    if (!selected || !nodeToLink || selected.linkedNodeIds.includes(nodeToLink)) return;
    onPatchEvent(selected.id, {
      linkedNodeIds: [...selected.linkedNodeIds, nodeToLink],
    });
    setNodeToLink("");
  };

  const linkEntity = () => {
    if (!selected || !entityToLink || selected.linkedEntityIds.includes(entityToLink)) return;
    onPatchEvent(selected.id, {
      linkedEntityIds: [...selected.linkedEntityIds, entityToLink],
    });
    setEntityToLink("");
  };

  return (
    <div className="timeline-workspace">
      <main className="timeline-main">
        <header className="timeline-header">
          <div>
            <span className="eyebrow">DUAL-AXIS TIMELINE</span>
            <h1>故事時間線</h1>
            <p>分開管理事件實際發生順序，以及讀者閱讀到它們的順序。</p>
          </div>
          <button className="timeline-add" onClick={addEvent}>
            <Plus size={15} />新增事件
          </button>
        </header>

        <section className="timeline-compare">
          <CompareLane title="故事內發生順序" icon={<Clock3 size={14} />} events={storyPreview} />
          <CompareLane title="讀者閱讀順序" icon={<BookOpenText size={14} />} events={narrativePreview} />
        </section>

        <div className="timeline-toolbar">
          <div className="timeline-axis-switch" aria-label="時間線排序方式">
            <button className={axis === "story" ? "active" : ""} onClick={() => setAxis("story")}>
              <Clock3 size={14} />故事時間
            </button>
            <button className={axis === "narrative" ? "active" : ""} onClick={() => setAxis("narrative")}>
              <BookOpenText size={14} />敘事順序
            </button>
          </div>
          <label className="timeline-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋事件或故事時間…" />
          </label>
          <span className="timeline-count">{visible.length} 個事件</span>
        </div>

        <div className="timeline-list">
          {visible.length === 0 ? (
            <div className="timeline-empty"><CalendarClock size={32} /><strong>沒有符合的事件</strong><span>清除搜尋，或新增一筆時間事件。</span></div>
          ) : (
            visible.map((event, index) => {
              const divergence = timelineDivergence(project.timelineEvents, event.id);
              const linkedEntities = project.entities.filter((entity) => event.linkedEntityIds.includes(entity.id));
              const linkedScenes = scenes.filter((scene) => event.linkedNodeIds.includes(scene.id));
              return (
                <article key={event.id} className={`timeline-card ${selectedId === event.id ? "active" : ""}`} onClick={() => setSelectedId(event.id)}>
                  <div className="timeline-order">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i style={{ background: event.color }} />
                  </div>
                  <div className="timeline-card-copy">
                    <div className="timeline-card-meta">
                      <span>{event.storyTimeLabel || "未設定故事時間"}</span>
                      <span className={`timeline-status ${event.status}`}>{statusLabels[event.status]}</span>
                      {divergence !== 0 && <span className="timeline-flashback"><GitCompareArrows size={11} />錯開 {Math.abs(divergence)} 格</span>}
                    </div>
                    <h2>{event.title}</h2>
                    <p>{event.summary || "尚未撰寫事件摘要。"}</p>
                    <div className="timeline-links-summary">
                      {linkedScenes.length > 0 && <span><BookOpenText size={11} />{linkedScenes.map((scene) => scene.title).join("、")}</span>}
                      {linkedEntities.length > 0 && <span><Users size={11} />{linkedEntities.map((entity) => entity.name).join("、")}</span>}
                    </div>
                  </div>
                  <div className="timeline-card-actions">
                    <button aria-label="向前移動" disabled={index === 0 || Boolean(query)} onClick={(click) => { click.stopPropagation(); onMoveEvent(event.id, -1, axis); }}><ArrowUp size={14} /></button>
                    <button aria-label="向後移動" disabled={index === visible.length - 1 || Boolean(query)} onClick={(click) => { click.stopPropagation(); onMoveEvent(event.id, 1, axis); }}><ArrowDown size={14} /></button>
                    <ChevronRight size={15} />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      <aside className="timeline-inspector">
        {selected ? (
          <>
            <header>
              <div><span className="eyebrow">EVENT</span><h2>事件資料</h2></div>
              <button aria-label="刪除事件" onClick={() => onRemoveEvent(selected.id)}><Trash2 size={15} /></button>
            </header>
            <div className="timeline-inspector-scroll">
              <label className="timeline-field"><span>事件名稱</span><input value={selected.title} onChange={(event) => onPatchEvent(selected.id, { title: event.target.value })} /></label>
              <label className="timeline-field"><span>故事內時間</span><input value={selected.storyTimeLabel} placeholder="例如：王曆 412 年冬、第三日深夜" onChange={(event) => onPatchEvent(selected.id, { storyTimeLabel: event.target.value })} /></label>
              <div className="timeline-two-fields">
                <label className="timeline-field"><span>類型</span><select value={selected.kind} onChange={(event) => onPatchEvent(selected.id, { kind: event.target.value as TimelineEventKind })}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="timeline-field"><span>狀態</span><select value={selected.status} onChange={(event) => onPatchEvent(selected.id, { status: event.target.value as TimelineEventStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              <div className="timeline-two-fields">
                <label className="timeline-field"><span>故事順序</span><input type="number" value={selected.storyOrder} onChange={(event) => onPatchEvent(selected.id, { storyOrder: Number(event.target.value) || 0 })} /></label>
                <label className="timeline-field"><span>敘事順序</span><input type="number" value={selected.narrativeOrder} onChange={(event) => onPatchEvent(selected.id, { narrativeOrder: Number(event.target.value) || 0 })} /></label>
              </div>
              <label className="timeline-field"><span>重要程度：{selected.importance}</span><input type="range" min="1" max="5" value={selected.importance} onChange={(event) => onPatchEvent(selected.id, { importance: Number(event.target.value) as TimelineEvent["importance"] })} /></label>
              <label className="timeline-field"><span>事件摘要</span><textarea value={selected.summary} placeholder="記錄事件起因、結果，以及需要校對的事實…" onChange={(event) => onPatchEvent(selected.id, { summary: event.target.value })} /></label>

              <TimelineLinkSection title="連結場景" icon={<BookOpenText size={14} />} value={nodeToLink} onValue={setNodeToLink} onAdd={linkNode} options={scenes.filter((scene) => !selected.linkedNodeIds.includes(scene.id)).map((scene) => ({ id: scene.id, label: scene.title }))}>
                {selected.linkedNodeIds.map((id) => { const scene = scenes.find((item) => item.id === id); return scene ? <div className="timeline-linked-item" key={id}><button onClick={() => onOpenScene(id)}><BookOpenText size={13} /><span>{scene.title}</span><ArrowRight size={12} /></button><button aria-label="取消場景連結" onClick={() => onPatchEvent(selected.id, { linkedNodeIds: selected.linkedNodeIds.filter((item) => item !== id) })}><Unlink size={12} /></button></div> : null; })}
              </TimelineLinkSection>

              <TimelineLinkSection title="連結世界觀" icon={<Users size={14} />} value={entityToLink} onValue={setEntityToLink} onAdd={linkEntity} options={project.entities.filter((entity) => !selected.linkedEntityIds.includes(entity.id)).map((entity) => ({ id: entity.id, label: entity.name }))}>
                {selected.linkedEntityIds.map((id) => { const entity = project.entities.find((item) => item.id === id); return entity ? <div className="timeline-linked-entity" key={id}><span style={{ background: entity.color }}><MapPin size={11} /></span><strong>{entity.name}</strong><button aria-label="取消世界觀連結" onClick={() => onPatchEvent(selected.id, { linkedEntityIds: selected.linkedEntityIds.filter((item) => item !== id) })}><Unlink size={12} /></button></div> : null; })}
              </TimelineLinkSection>

              <div className="timeline-guidance"><AlertCircle size={15} /><p><strong>雙軸提示</strong>{timelineDivergence(project.timelineEvents, selected.id) === 0 ? "此事件在故事時間與敘事順序的位置相同。" : "此事件的兩個位置不同，可用於倒敘、插敘或延後揭露。"}</p></div>
            </div>
          </>
        ) : (
          <div className="timeline-inspector-empty"><CalendarClock size={30} /><span>選擇或新增一個事件</span></div>
        )}
      </aside>
    </div>
  );
}

function CompareLane({ title, icon, events }: { title: string; icon: React.ReactNode; events: TimelineEvent[] }) {
  return <div className="compare-lane"><div className="compare-lane-title">{icon}<span>{title}</span></div><div className="compare-events">{events.length === 0 ? <span className="compare-empty">尚無事件</span> : events.map((event, index) => <div key={event.id}><i style={{ background: event.color }} /><span>{index + 1}</span><strong>{event.title}</strong>{index < events.length - 1 && <ArrowRight size={11} />}</div>)}</div></div>;
}

function TimelineLinkSection({ title, icon, value, onValue, onAdd, options, children }: { title: string; icon: React.ReactNode; value: string; onValue: (value: string) => void; onAdd: () => void; options: Array<{ id: string; label: string }>; children: React.ReactNode }) {
  return <section className="timeline-link-section"><h3>{icon}{title}</h3><div className="timeline-link-picker"><select value={value} onChange={(event) => onValue(event.target.value)}><option value="">選擇要連結的項目</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button onClick={onAdd} disabled={!value}><Link2 size={13} />加入</button></div><div className="timeline-linked-list">{children}</div></section>;
}
