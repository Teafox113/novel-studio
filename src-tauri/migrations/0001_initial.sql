PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_projects (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    title TEXT NOT NULL,
    project_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_projects_updated_at
    ON app_projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS project_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    project_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_created
    ON project_snapshots(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_assets (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    media_type TEXT,
    byte_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, content_hash)
);

CREATE TABLE IF NOT EXISTS sync_operations (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    base_revision INTEGER NOT NULL,
    operation_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_pending
    ON sync_operations(project_id, synced_at, created_at);
