import { describe, expect, it } from "vitest";
import type { TimelineEvent } from "./models";
import {
  filterTimelineEvents,
  moveTimelineEvent,
  sortTimelineEvents,
  timelineDivergence,
} from "./timeline";

const events: TimelineEvent[] = [
  {
    id: "reveal",
    title: "真相揭露",
    summary: "讀者最後才知道的往事",
    kind: "backstory",
    status: "confirmed",
    storyTimeLabel: "十年前",
    storyOrder: 1,
    narrativeOrder: 2,
    importance: 5,
    linkedNodeIds: [],
    linkedEntityIds: [],
    color: "#000000",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "arrival",
    title: "主角抵達",
    summary: "故事開場",
    kind: "scene-event",
    status: "planned",
    storyTimeLabel: "今日",
    storyOrder: 2,
    narrativeOrder: 1,
    importance: 3,
    linkedNodeIds: [],
    linkedEntityIds: [],
    color: "#000000",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

describe("timeline helpers", () => {
  it("sorts independently by story and narrative order", () => {
    expect(sortTimelineEvents(events, "story").map((event) => event.id)).toEqual([
      "reveal",
      "arrival",
    ]);
    expect(
      sortTimelineEvents(events, "narrative").map((event) => event.id),
    ).toEqual(["arrival", "reveal"]);
  });

  it("moves one axis without changing the other", () => {
    const moved = moveTimelineEvent(events, "reveal", 1, "story");
    expect(sortTimelineEvents(moved, "story")[1].id).toBe("reveal");
    expect(moved.find((event) => event.id === "reveal")?.narrativeOrder).toBe(2);
  });

  it("searches event time labels and reports flashback divergence", () => {
    expect(filterTimelineEvents(events, "十年前")).toHaveLength(1);
    expect(timelineDivergence(events, "reveal")).toBe(1);
  });
});
