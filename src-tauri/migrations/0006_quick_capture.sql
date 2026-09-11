CREATE TABLE IF NOT EXISTS research_inspiration_links (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  research_id TEXT NOT NULL,
  inspiration_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, research_id, inspiration_id),
  FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_inspiration_links_research
  ON research_inspiration_links(project_id, research_id);

CREATE INDEX IF NOT EXISTS idx_research_inspiration_links_inspiration
  ON research_inspiration_links(project_id, inspiration_id);
