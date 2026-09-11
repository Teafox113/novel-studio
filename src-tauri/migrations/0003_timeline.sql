CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  story_time_label TEXT NOT NULL DEFAULT '',
  story_order REAL NOT NULL,
  narrative_order REAL NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3,
  linked_node_ids_json TEXT NOT NULL DEFAULT '[]',
  linked_entity_ids_json TEXT NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#7b87b8',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_project_story
  ON timeline_events(project_id, story_order);

CREATE INDEX IF NOT EXISTS idx_timeline_events_project_narrative
  ON timeline_events(project_id, narrative_order);
