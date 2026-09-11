use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_URL: &str = "sqlite:novel-studio.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_project_storage",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_knowledge_graph_and_inspiration_storage",
            sql: include_str!("../migrations/0002_knowledge_graph.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_dual_axis_timeline_storage",
            sql: include_str!("../migrations/0003_timeline.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_research_library_storage",
            sql: include_str!("../migrations/0004_research.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_ai_review_findings_storage",
            sql: include_str!("../migrations/0005_ai_review.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_quick_capture_links",
            sql: include_str!("../migrations/0006_quick_capture.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("Novel Studio failed to start");
}
