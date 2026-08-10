use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Credentials {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "clientSecret")]
    pub client_secret: String,
    // Absent from the QA/staging credentials file (staging-loki_user_data.json only has userId
    // and clientSecret), so this defaults to empty rather than failing to parse.
    #[serde(rename = "snowId", default)]
    pub snow_id: String,
}

// The game writes its local account credentials here.
#[cfg(target_os = "macos")]
fn credentials_path(environment: &str) -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
    let (app_dir, file_name) = match environment {
        "prod" => ("com.snowprintstudios.tacticus", "live-loki_user_data.json"),
        "qa" => ("com.snowprintstudios.loki.qa", "staging-loki_user_data.json"),
        other => return Err(format!("Unknown environment: {other}")),
    };
    Ok(PathBuf::from(home).join("Library/Application Support").join(app_dir).join(file_name))
}

// Only the prod client's persistentDataPath is confirmed on Windows - the QA build likely uses a
// different Unity product-name folder (mirroring the separate bundle id macOS's QA build uses),
// but that folder name isn't known yet, so QA errors out explicitly here instead of guessing.
#[cfg(target_os = "windows")]
fn credentials_path(environment: &str) -> Result<PathBuf, String> {
    let user_profile =
        std::env::var("USERPROFILE").map_err(|_| "USERPROFILE environment variable not set".to_string())?;
    let file_name = match environment {
        "prod" => "live-loki_user_data.json",
        "qa" => return Err("QA credential auto-discovery on Windows isn't confirmed yet.".to_string()),
        other => return Err(format!("Unknown environment: {other}")),
    };
    Ok(PathBuf::from(user_profile)
        .join("AppData")
        .join("LocalLow")
        .join("Snowprint")
        .join("Warhammer 40,000_ Tacticus")
        .join(file_name))
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn credentials_path(_environment: &str) -> Result<PathBuf, String> {
    Err("Credential auto-discovery is only implemented for macOS and Windows right now.".to_string())
}

#[tauri::command]
pub fn find_credentials(environment: String) -> Result<Credentials, String> {
    let path = credentials_path(&environment)?;
    let contents = std::fs::read_to_string(&path).map_err(|e| format!("Couldn't read {}: {}", path.display(), e))?;
    serde_json::from_str(&contents).map_err(|e| format!("Couldn't parse {}: {}", path.display(), e))
}
