mod credentials;
mod crusades;
mod export;
mod loki;

use credentials::find_credentials;
use crusades::{fetch_crusade_data, fetch_leaderboard_data};
use export::write_text_file;
use loki::fetch_player_data;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            find_credentials,
            fetch_player_data,
            write_text_file,
            fetch_crusade_data,
            fetch_leaderboard_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
