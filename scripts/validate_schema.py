"""Validate Novel Studio's SQLite migration without creating local files."""

from pathlib import Path
import sqlite3


MIGRATIONS = [
    Path(__file__).resolve().parents[1]
    / "src-tauri"
    / "migrations"
    / name
    for name in (
        "0001_initial.sql",
        "0002_knowledge_graph.sql",
        "0003_timeline.sql",
        "0004_research.sql",
        "0005_ai_review.sql",
        "0006_quick_capture.sql",
    )
]


def main() -> None:
    database = sqlite3.connect(":memory:")
    for migration in MIGRATIONS:
        database.executescript(migration.read_text(encoding="utf-8"))

    database.execute(
        """
        INSERT INTO app_projects (
            id,
            schema_version,
            title,
            project_json,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("project-1", 1, "測試小說", "{}", "2026-07-29", "2026-07-29"),
    )
    database.execute(
        """
        INSERT INTO app_projects (
            id,
            schema_version,
            title,
            project_json,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            schema_version = excluded.schema_version,
            title = excluded.title,
            project_json = excluded.project_json,
            updated_at = excluded.updated_at
        """,
        (
            "project-1",
            1,
            "更新小說",
            '{"ok":true}',
            "2026-07-29",
            "2026-07-29T01:00:00",
        ),
    )

    tables = {
        row[0]
        for row in database.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    expected_tables = {
        "app_projects",
        "project_snapshots",
        "project_assets",
        "sync_operations",
        "knowledge_entities",
        "entity_aliases",
        "entity_relations",
        "project_tags",
        "tag_links",
        "scene_entity_links",
        "inspiration_items",
        "timeline_events",
        "research_items",
        "ai_findings",
        "research_inspiration_links",
    }
    missing = expected_tables - tables
    if missing:
        raise RuntimeError(f"Missing tables: {sorted(missing)}")

    project = database.execute(
        "SELECT title, project_json FROM app_projects WHERE id = ?",
        ("project-1",),
    ).fetchone()
    if project != ("更新小說", '{"ok":true}'):
        raise RuntimeError(f"Upsert verification failed: {project!r}")

    database.execute(
        """
        INSERT INTO knowledge_entities (
            id, project_id, entity_type, canonical_name, summary,
            entity_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "entity-1",
            "project-1",
            "character",
            "測試人物",
            "",
            "{}",
            "2026-07-29",
            "2026-07-29",
        ),
    )
    database.execute(
        """
        INSERT INTO ai_findings (
            id, project_id, fingerprint, kind, status, severity,
            target_type, target_id, finding_json, detected_at, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "finding-1", "project-1", "missing-pov:scene-1", "missing-metadata",
            "pending", "warning", "scene", "scene-1", "{}",
            "2026-07-29", "",
        ),
    )
    database.execute(
        """
        INSERT INTO research_items (
            id, project_id, title, kind, status, summary, source_url,
            media_type, byte_size, item_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "research-1", "project-1", "測試資料", "web", "inbox", "",
            "https://example.com", "text/html", 0, "{}",
            "2026-07-29", "2026-07-29",
        ),
    )
    database.execute(
        """
        INSERT INTO timeline_events (
            id, project_id, title, summary, kind, status,
            story_time_label, story_order, narrative_order, importance,
            linked_node_ids_json, linked_entity_ids_json, color,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "event-1", "project-1", "測試事件", "", "scene-event", "planned",
            "第一日", 1, 2, 3, "[]", "[]", "#7b87b8",
            "2026-07-29", "2026-07-29",
        ),
    )
    database.execute(
        """
        INSERT INTO inspiration_items (
            id, project_id, title, content, kind, status,
            item_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "idea-1",
            "project-1",
            "測試靈感",
            "尚未使用的構思",
            "plot",
            "inbox",
            "{}",
            "2026-07-29",
            "2026-07-29",
        ),
    )

    print(
        "SQLite schema validation passed "
        "(15 application tables, knowledge graph, timeline, research, capture links and AI review storage verified)."
    )


if __name__ == "__main__":
    main()
