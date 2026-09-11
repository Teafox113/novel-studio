PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS knowledge_entities (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    entity_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, entity_type, canonical_name)
);

CREATE INDEX IF NOT EXISTS idx_entities_project_type
    ON knowledge_entities(project_id, entity_type, canonical_name);

CREATE TABLE IF NOT EXISTS entity_aliases (
    entity_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    PRIMARY KEY(entity_id, normalized_alias),
    FOREIGN KEY(entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_alias_lookup
    ON entity_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS entity_relations (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    relation_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(from_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
    FOREIGN KEY(to_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_relations_from
    ON entity_relations(project_id, from_entity_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_entity_relations_to
    ON entity_relations(project_id, to_entity_id, relation_type);

CREATE TABLE IF NOT EXISTS project_tags (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS tag_links (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES project_tags(id) ON DELETE CASCADE,
    UNIQUE(tag_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_links_target
    ON tag_links(project_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS scene_entity_links (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    scene_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    link_role TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
    UNIQUE(scene_id, entity_id, link_role)
);

CREATE INDEX IF NOT EXISTS idx_scene_entity_lookup
    ON scene_entity_links(project_id, scene_id, link_role);

CREATE TABLE IF NOT EXISTS inspiration_items (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    item_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES app_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inspiration_project_status
    ON inspiration_items(project_id, status, updated_at DESC);
