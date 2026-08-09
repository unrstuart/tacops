use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Credentials {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "clientSecret")]
    pub client_secret: String,
    #[serde(rename = "snowId")]
    pub snow_id: String,
}

// The game writes its local account credentials here. Windows' equivalent path isn't confirmed
// yet, so this is macOS-only for now.
#[cfg(target_os = "macos")]
fn credentials_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
    Ok(PathBuf::from(home)
        .join("Library/Application Support/com.snowprintstudios.tacticus/live-loki_user_data.json"))
}

#[cfg(not(target_os = "macos"))]
fn credentials_path() -> Result<PathBuf, String> {
    Err("Credential auto-discovery is only implemented for macOS right now.".to_string())
}

#[tauri::command]
pub fn find_credentials() -> Result<Credentials, String> {
    let path = credentials_path()?;
    let contents = std::fs::read_to_string(&path).map_err(|e| format!("Couldn't read {}: {}", path.display(), e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Couldn't parse {}: {}", path.display(), e))
}
