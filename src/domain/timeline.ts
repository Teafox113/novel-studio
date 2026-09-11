import type { TimelineEvent } from "./models";

export type TimelineAxis = "story" | "narrative";

function orderForAxis(event: TimelineEvent, axis: TimelineAxis): number {
  return axis === "story" ? event.storyOrder : event.narrativeOrder;
}

export function sortTimelineEvents(
  events: TimelineEvent[],
  axis: TimelineAxis,
): TimelineEvent[] {
  return [...events].sort(
    (left, right) =>
      orderForAxis(left, axis) - orderForAxis(right, axis) ||
      left.title.localeCompare(right.title, "zh-TW"),
  );
}

export function filterTimelineEvents(
  events: TimelineEvent[],
  query: string,
): TimelineEvent[] {
  const normalized = query.trim().toLocaleLowerCase("zh-TW");
  if (!normalized) return events;
  return events.filter((event) =>
    [event.title, event.summary, event.storyTimeLabel]
      .join(" ")
      .toLocaleLowerCase("zh-TW")
      .includes(normalized),
  );
}

export function moveTimelineEvent(
  events: TimelineEvent[],
  eventId: string,
  direction: -1 | 1,
  axis: TimelineAxis,
): TimelineEvent[] {
  const ordered = sortTimelineEvents(events, axis);
  const index = ordered.findIndex((event) => event.id === eventId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return events;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const now = new Date().toISOString();
  const orderUpdates = new Map(
    ordered.map((event, eventIndex) => [event.id, eventIndex + 1]),
  );
  return events.map((event) => {
    const order = orderUpdates.get(event.id);
    if (order === undefined) return event;
    return axis === "story"
      ? { ...event, storyOrder: order, updatedAt: now }
      : { ...event, narrativeOrder: order, updatedAt: now };
  });
}

export function timelineDivergence(
  events: TimelineEvent[],
  eventId: string,
): number {
  const storyIndex = sortTimelineEvents(events, "story").findIndex(
    (event) => event.id === eventId,
  );
  const narrativeIndex = sortTimelineEvents(events, "narrative").findIndex(
    (event) => event.id === eventId,
  );
  return storyIndex < 0 || narrativeIndex < 0
    ? 0
    : narrativeIndex - storyIndex;
}
