use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::{Path, PathBuf}, sync::{Mutex, atomic::{AtomicU64, Ordering}}, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Default, Clone, Serialize, Deserialize)]
pub struct BackupConfig { local: Option<PathBuf>, drive: Option<PathBuf> }
#[derive(Default)]
pub struct BackupLock(pub Mutex<()>);
static SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_config_dir().map_err(|e| e.to_string())?.join("folder-backup.json"))
}
fn load(app: &tauri::AppHandle) -> Result<BackupConfig, String> {
    match fs::read(config_path(app)?) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|_| "備份設定損壞，請先保留設定檔並聯絡支援。".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(BackupConfig::default()),
        Err(e) => Err(e.to_string()),
    }
}
fn save(app: &tauri::AppHandle, config: &BackupConfig) -> Result<(), String> {
    let path = config_path(app)?;
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let temp = path.with_extension("tmp");
    let mut file = fs::File::create(&temp).map_err(|e| e.to_string())?;
    file.write_all(&serde_json::to_vec(config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(temp, path).map_err(|e| e.to_string())
}
#[tauri::command]
pub fn backup_config(app: tauri::AppHandle, lock: State<BackupLock>) -> Result<BackupConfig, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    load(&app)
}
#[tauri::command]
pub async fn backup_select(app: tauri::AppHandle, slot: String) -> Result<BackupConfig, String> {
    if slot != "local" && slot != "drive" { return Err("不支援的備份位置".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().set_title(if slot == "drive" { "選擇 Google Drive 電腦版中的備份資料夾" } else { "選擇本機備份資料夾" }).blocking_pick_folder();
        let lock = app.state::<BackupLock>();
        let _guard = lock.0.lock().map_err(|e| e.to_string())?;
        let mut config = load(&app)?;
        if let Some(selected) = selected {
            let path = selected.into_path().map_err(|e| e.to_string())?.canonicalize().map_err(|e| e.to_string())?;
            if !path.is_dir() { return Err("請選擇資料夾".into()); }
            let other = if slot == "local" { &config.drive } else { &config.local };
            if other.as_ref() == Some(&path) { return Err("兩個備份位置必須使用不同資料夾。".into()); }
            if slot == "local" { config.local = Some(path); } else { config.drive = Some(path); }
            save(&app, &config)?;
        }
        Ok(config)
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn backup_disconnect(app: tauri::AppHandle, lock: State<BackupLock>, slot: String) -> Result<BackupConfig, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let mut config = load(&app)?;
    match slot.as_str() { "local" => config.local = None, "drive" => config.drive = None, _ => return Err("不支援的備份位置".into()) }
    save(&app, &config)?;
    Ok(config)
}

// Only writes new snapshots inside a directory selected by the native folder picker.
// A partially written file never receives the .novel extension.
fn write_snapshot(folder: &Path, content: &str) -> Result<String, String> {
    let archive: serde_json::Value = serde_json::from_str(content).map_err(|_| "備份內容不是有效 JSON")?;
    if archive["format"] != "novel-studio-project" || archive["formatVersion"] != 1 || !archive["project"].is_object() {
        return Err("備份格式不正確".into());
    }
    if !folder.is_dir() { return Err("備份資料夾無法使用，請確認磁碟或 Google Drive 電腦版已連線。".into()); }
    let title: String = archive["project"]["title"].as_str().unwrap_or("Novel").chars()
        .filter(|c| !c.is_control() && !"<>:\"/\\|?*.".contains(*c)).take(32).collect();
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let filename = format!("Novel-{}-{}-{}-{}.novel", title.trim(), stamp, std::process::id(), SEQUENCE.fetch_add(1, Ordering::Relaxed));
    let target = folder.join(&filename);
    let temp = target.with_extension("partial");
    let result = (|| {
        let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&temp).map_err(|e| e.to_string())?;
        file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        drop(file);
        if fs::read(&temp).map_err(|e| e.to_string())? != content.as_bytes() { return Err("備份寫入驗證失敗".into()); }
        if target.exists() { return Err("備份檔名衝突，請重試".into()); }
        fs::rename(&temp, &target).map_err(|e| e.to_string())?;
        Ok(filename)
    })();
    if result.is_err() { let _ = fs::remove_file(&temp); }
    result
}
#[tauri::command]
pub async fn backup_write(app: tauri::AppHandle, slot: String, content: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let lock = app.state::<BackupLock>();
        let _guard = lock.0.lock().map_err(|e| e.to_string())?;
        let config = load(&app)?;
        let folder = match slot.as_str() { "local" => config.local, "drive" => config.drive, _ => None }.ok_or("尚未設定備份資料夾")?;
        write_snapshot(&folder, &content)
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snapshots_are_unique_complete_and_preserve_old_versions() {
        let dir = std::env::temp_dir().join(format!("novel-backup-test-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir(&dir).unwrap();
        let data = r#"{"format":"novel-studio-project","formatVersion":1,"project":{"title":"../測試:作品"}}"#;
        let first = write_snapshot(&dir, data).unwrap();
        let second = write_snapshot(&dir, data).unwrap();
        assert_ne!(first, second);
        assert_eq!(list_backups(&dir).unwrap().len(), 2);
        assert!(safe_backup_path(&dir, "../outside.novel").is_err());
        assert!(safe_backup_path(&dir, "Novel-file.novel:stream").is_err());
        assert_eq!(safe_backup_path(&dir, &first).unwrap(), dir.join(&first).canonicalize().unwrap());

        assert_eq!(fs::read_to_string(dir.join(&first)).unwrap(), data);
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 2);
        assert!(write_snapshot(&dir, "{}").is_err());
        assert!(write_snapshot(&dir.join("missing"), data).is_err());
        fs::remove_file(dir.join(first)).unwrap();
        fs::remove_file(dir.join(second)).unwrap();
        fs::remove_dir(dir).unwrap();
    }
}

#[derive(Serialize)]
pub struct BackupEntry { name: String, modified: u64, size: u64 }
fn safe_backup_path(folder: &Path, name: &str) -> Result<PathBuf, String> {
    if !name.starts_with("Novel-") || !name.ends_with(".novel") || name.contains(['/', '\\', ':']) || name.contains("..") { return Err("無效的備份檔名".into()); }
    let root = folder.canonicalize().map_err(|e| e.to_string())?;
    let path = folder.join(name).canonicalize().map_err(|e| e.to_string())?;
    if path.parent() != Some(root.as_path()) || !path.is_file() { return Err("備份必須位於已選資料夾內".into()); }
    Ok(path)
}
fn list_backups(folder: &Path) -> Result<Vec<BackupEntry>, String> {
    let mut entries = Vec::new();
    for item in fs::read_dir(folder).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let name = item.file_name().to_string_lossy().into_owned();
        if let Ok(path) = safe_backup_path(folder, &name) {
            let m = path.metadata().map_err(|e| e.to_string())?;
            entries.push(BackupEntry { name, size: m.len(), modified: m.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|t| t.as_secs()).unwrap_or(0) });
        }
    }
    entries.sort_by(|a,b| b.modified.cmp(&a.modified).then_with(|| b.name.cmp(&a.name)));
    entries.truncate(200);
    Ok(entries)
}
fn selected_folder(app: &tauri::AppHandle, slot: &str) -> Result<PathBuf, String> {
    let config = load(app)?;
    match slot { "local" => config.local, "drive" => config.drive, _ => None }.ok_or("尚未設定備份位置".into())
}
#[tauri::command]
pub async fn backup_list(app: tauri::AppHandle, slot: String) -> Result<Vec<BackupEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || list_backups(&selected_folder(&app, &slot)?)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn backup_read(app: tauri::AppHandle, slot: String, name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = safe_backup_path(&selected_folder(&app, &slot)?, &name)?;
        if path.metadata().map_err(|e| e.to_string())?.len() > 256 * 1024 * 1024 { return Err("此備份超過 256 MB，請使用匯入專案。".into()); }
        fs::read_to_string(path).map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())?
}
