mod credentials;
mod loki;

use credentials::find_credentials;
use loki::fetch_player_data;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![find_credentials, fetch_player_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
