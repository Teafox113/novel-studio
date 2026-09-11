CREATE TABLE IF NOT EXISTS ai_findings (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  finding_json TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_ai_findings_project_status
  ON ai_findings(project_id, status, severity, detected_at DESC);
