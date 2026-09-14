import { useState } from "react";
import type { StoryProject, TimelineEvent } from "../domain/models";
import { absoluteDay, defaultHistory, formatFictionalDate, validateHistory, type FictionalCalendar, type FictionalDate } from "../domain/fictionalHistory";

export function FictionalHistoryWorkspace({ project, onChange, onOpenScene }: { project: StoryProject; onChange: (project: StoryProject) => void; onOpenScene: (id: string) => void }) {
  const history = project.fictionalHistory ?? defaultHistory();
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selected = project.timelineEvents.find(e => e.id === selectedId);
  const ordered = [...project.timelineEvents].sort((a, b) => {
    const left = history.dates[a.id], right = history.dates[b.id];
    return left && right ? absoluteDay(history.calendar, left) - absoluteDay(history.calendar, right) || a.title.localeCompare(b.title) : left ? -1 : right ? 1 : a.storyOrder - b.storyOrder;
  });
  const visible = ordered.filter(e => `${e.title} ${e.summary} ${e.storyTimeLabel}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const saveEvent = (event: TimelineEvent, date?: FictionalDate) => {
    try {
      const dates = { ...history.dates };
      if (date) dates[event.id] = date; else delete dates[event.id];
      const nextHistory = validateHistory({ ...history, dates });
      onChange({ ...project, schemaVersion: 7, fictionalHistory: nextHistory, timelineEvents: project.timelineEvents.map(e => e.id === event.id ? { ...event, storyTimeLabel: date ? formatFictionalDate(history.calendar, date) : "未設定故事時間", updatedAt: new Date().toISOString() } : e), updatedAt: new Date().toISOString() });
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "無法儲存。"); }
  };
  return <div className="history-workspace">
    <header><div><span className="eyebrow">FICTIONAL HISTORY</span><h1>架空歷史一覽</h1><p>{history.calendar.name} · {history.calendar.era} · 每年 {history.calendar.months.reduce((n, m) => n + m.days, 0)} 日 · 每週 {history.calendar.weekdays.length} 日</p></div><button onClick={() => setCalendarOpen(true)}>設定曆法</button><button onClick={() => {
      const id = crypto.randomUUID(), now = new Date().toISOString();
      const event: TimelineEvent = { id, title: "新的歷史事件", summary: "", kind: "historical", status: "planned", storyTimeLabel: "未設定故事時間", storyOrder: Math.max(0, ...project.timelineEvents.map(e => e.storyOrder)) + 1, narrativeOrder: Math.max(0, ...project.timelineEvents.map(e => e.narrativeOrder)) + 1, importance: 3, linkedNodeIds: [], linkedEntityIds: [], color: "#b58653", createdAt: now, updatedAt: now };
      onChange({ ...project, timelineEvents: [...project.timelineEvents, event], updatedAt: now }); setSelectedId(id);
    }}>新增歷史事件</button></header>
    <p className="history-note">事件與「時間線」共用；此處依虛構日期排序，不改變閱讀順序。紀元前使用負數年份，沒有零年；目前採固定月長，不含閏年。</p>
    {error && <p role="alert" className="history-error">{error}</p>}
    <div className="history-columns"><section className="history-timeline"><label>搜尋歷史<input value={query} onChange={e => setQuery(e.target.value)} placeholder="事件、摘要或日期" /></label>
      {visible.length === 0 && <p>目前沒有符合的事件，新增一筆歷史開始建立世界。</p>}
      {visible.map(event => <button className={`history-event ${event.id === selectedId ? "active" : ""}`} key={event.id} onClick={() => { setSelectedId(event.id); setError(""); }}><time>{history.dates[event.id] ? formatFictionalDate(history.calendar, history.dates[event.id]) : "尚未編年"}</time><strong>{event.title}</strong><span>{event.summary || "尚無摘要"}</span></button>)}
    </section><section className="history-detail">{selected ? <EventForm key={selected.id + JSON.stringify(history.calendar)} event={selected} date={history.dates[selected.id]} project={project} onSave={saveEvent} onOpenScene={onOpenScene} /> : <div className="history-empty"><h2>從一段歷史，開始建立世界</h2><p>選取左側事件，設定年份、月份與日期，並連結場景或世界觀人物。既有事件會出現在「尚未編年」。</p></div>}</section></div>
    {calendarOpen && <CalendarForm calendar={history.calendar} onClose={() => setCalendarOpen(false)} onSave={calendar => {
      const nextHistory = validateHistory({ calendar, dates: history.dates });
      onChange({ ...project, schemaVersion: 7, fictionalHistory: nextHistory, timelineEvents: project.timelineEvents.map(e => history.dates[e.id] ? { ...e, storyTimeLabel: formatFictionalDate(calendar, history.dates[e.id]) } : e), updatedAt: new Date().toISOString() }); setCalendarOpen(false);
    }} />}
  </div>;
}

function EventForm({ event, date, project, onSave, onOpenScene }: { event: TimelineEvent; date?: FictionalDate; project: StoryProject; onSave: (event: TimelineEvent, date?: FictionalDate) => void; onOpenScene: (id: string) => void }) {
  const calendar = (project.fictionalHistory ?? defaultHistory()).calendar;
  const [draft, setDraft] = useState(event);
  const [dated, setDated] = useState(Boolean(date));
  const [when, setWhen] = useState(date ?? { year: 1, month: 1, day: 1 });
  return <form onSubmit={e => { e.preventDefault(); onSave(draft, dated ? when : undefined); }}><h2>事件與年代設定</h2><label>事件名稱<input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><label>歷史摘要<textarea rows={5} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></label>
    <label><input type="checkbox" checked={dated} onChange={e => setDated(e.target.checked)} />設定虛構日期</label>
    {dated && <div className="history-date"><label>年份（負數為紀元前）<input type="number" min={-1000000} max={1000000} required value={when.year} onChange={e => setWhen({ ...when, year: Number(e.target.value) })} /></label><label>月份<select value={when.month} onChange={e => setWhen({ ...when, month: Number(e.target.value) })}>{calendar.months.map((m, i) => <option key={i} value={i + 1}>{m.name}</option>)}</select></label><label>日<input type="number" min={1} max={calendar.months[when.month - 1]?.days ?? 1} required value={when.day} onChange={e => setWhen({ ...when, day: Number(e.target.value) })} /></label></div>}
    <label>連結場景（可多選）<select multiple value={draft.linkedNodeIds} onChange={e => setDraft({ ...draft, linkedNodeIds: Array.from(e.target.selectedOptions, option => option.value) })}>{project.nodes.filter(n => n.kind === "scene").map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
    <label>連結世界觀（可多選）<select multiple value={draft.linkedEntityIds} onChange={e => setDraft({ ...draft, linkedEntityIds: Array.from(e.target.selectedOptions, option => option.value) })}>{project.entities.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
    <p>按 Ctrl 可選取多筆；離開事件前請先儲存。</p><button type="submit">儲存歷史事件</button>
    {event.linkedNodeIds.map(id => <button type="button" key={id} onClick={() => onOpenScene(id)}>開啟 {project.nodes.find(n => n.id === id)?.title ?? "場景"}</button>)}
  </form>;
}

function CalendarForm({ calendar, onSave, onClose }: { calendar: FictionalCalendar; onSave: (calendar: FictionalCalendar) => void; onClose: () => void }) {
  const [name, setName] = useState(calendar.name), [era, setEra] = useState(calendar.era);
  const [months, setMonths] = useState(calendar.months.map(m => `${m.name},${m.days}`).join("\n"));
  const [weekdays, setWeekdays] = useState(calendar.weekdays.join(","));
  const [error, setError] = useState("");
  return <div className="dialog-backdrop"><form className="history-calendar" role="dialog" aria-modal="true" aria-label="設定架空曆法" onSubmit={e => { e.preventDefault(); try { onSave({ name: name.trim(), era: era.trim(), months: months.split("\n").filter(line => line.trim()).map(line => { const parts = line.split(/[,，]/); return { name: parts[0].trim(), days: parts.length === 2 ? Number(parts[1]) : NaN }; }), weekdays: weekdays.split(/[,，]/).map(day => day.trim()) }); } catch (reason) { setError(reason instanceof Error ? reason.message : "格式錯誤"); } }}><h2>設定架空曆法</h2><label>曆法名稱<input required value={name} onChange={e => setName(e.target.value)} /></label><label>紀元名稱<input required value={era} onChange={e => setEra(e.target.value)} /></label><label>月份與天數（每行：名稱,天數）<textarea rows={8} value={months} onChange={e => setMonths(e.target.value)} /></label><label>週日名稱（逗號分隔）<input value={weekdays} onChange={e => setWeekdays(e.target.value)} /></label><p>紀元 1 年首日為第一個週日。調整月份順序會重新解讀同一月序的日期；每年固定月長，不含閏日。</p>{error && <p role="alert">{error}</p>}<button type="submit">儲存曆法</button><button type="button" onClick={onClose}>取消</button></form></div>;
}
