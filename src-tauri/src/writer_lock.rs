use std::{fs::{File, OpenOptions}, path::Path};

// The OS releases this lock when the process exits, including after a crash.
pub fn acquire(path: &Path) -> Result<File, String> {
    let file = OpenOptions::new().read(true).write(true).create(true).truncate(false)
        .open(path).map_err(|e| e.to_string())?;
    file.try_lock().map_err(|e| format!("無法取得作品寫入鎖：{e}"))?;
    Ok(file)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn second_writer_is_blocked_until_first_handle_closes() {
        let path = std::env::temp_dir().join(format!("novel-writer-{}.lock", std::process::id()));
        let first = acquire(&path).unwrap();
        assert!(acquire(&path).is_err());
        drop(first);
        drop(acquire(&path).unwrap());
        std::fs::remove_file(path).unwrap();
    }
}
