use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};

// Confirmed via real Proxyman captures: the actual game client reuses this exact trio unchanged
// across APP_START, CONNECT, and GET_PLAYER in the same session - not re-derived per call. Same
// values on both prod and QA.
const GAME_CONFIG_VERSION: &str = "f92fb06ae9c02542bb3f520fc562f709";
const MULTI_CONFIG_VERSION: &str = "897f8de5439de707acaf6b3add1eeba3";
pub(crate) const INSTALL_ID: &str = "scraper-installid";

// The fields below this line come straight from a real captured QA CONNECT request and differ
// from prod. Device/hardware fingerprint fields (os, model, screen size, graphics, ram, ...)
// are deliberately left as generic scraper values on both environments instead of mirrored from
// that capture - prod already works fine with fully fake device data, so there's no evidence the
// backend validates them.
pub(crate) struct EnvironmentConfig {
    base_url: &'static str,
    // The signed game-event service (game3). Auth is still userId + sessionId in the URL path,
    // but these events carry an anti-tamper MD5 digest; GET_GUILD_STATE only lives here.
    pub(crate) game_event_base_url: &'static str,
    // The realtime channel push service (guild chat / guild events) — the bare host (wss on 443).
    // Auth is userId + sessionId sent as websocket handshake HEADERS, not in the URL path. The
    // handshake is done by hand (see guild_chat.rs) so the header names keep their exact camelCase,
    // which is why this is a host rather than a full URL.
    pub(crate) websocket_host: &'static str,
    environment_id: &'static str,
    bundle_id: &'static str,
    jenkins_build_branch_info: &'static str,
    built_in_multi_config_version: &'static str,
}

const PROD_CONFIG: EnvironmentConfig = EnvironmentConfig {
    base_url: "https://api-live.loki.snowprintstudios.com/player/player2/userId",
    game_event_base_url: "https://api-live.loki.snowprintstudios.com/game-event/game3/userId",
    websocket_host: "websocket-live.loki.snowprintstudios.com",
    environment_id: "live-loki",
    bundle_id: "com.snowprintstudios.tacticus",
    jenkins_build_branch_info: "release",
    built_in_multi_config_version: "f34892307c9d4727869adf53f3afa446",
};

const QA_CONFIG: EnvironmentConfig = EnvironmentConfig {
    base_url: "https://api-staging.loki.snowprintstudios.com/player/player2/userId",
    game_event_base_url: "https://api-staging.loki.snowprintstudios.com/game-event/game3/userId",
    websocket_host: "websocket-staging.loki.snowprintstudios.com",
    environment_id: "staging-loki",
    bundle_id: "com.snowprintstudios.loki.qa",
    jenkins_build_branch_info: "staging",
    built_in_multi_config_version: "34c80d71f65bd74deb6ba74f01d1c725",
};

pub(crate) fn environment_config(environment: &str) -> Result<&'static EnvironmentConfig, String> {
    match environment {
        "prod" => Ok(&PROD_CONFIG),
        "qa" => Ok(&QA_CONFIG),
        other => Err(format!("Unknown environment: {other}")),
    }
}

pub(crate) fn now_ms() -> String {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string()
}

fn envelope(player_event_type: &str, player_event_data: Value, config: &EnvironmentConfig) -> Value {
    json!({
        "playerEvent": {
            "playerEventType": player_event_type,
            "playerEventData": player_event_data,
            "universeVersion": "universe_not_needed",
            "gameConfigVersion": GAME_CONFIG_VERSION,
            "createdOn": now_ms(),
            "multiConfigVersion": MULTI_CONFIG_VERSION,
        },
        "builtInMultiConfigVersion": config.built_in_multi_config_version,
        "installId": INSTALL_ID,
    })
}

pub(crate) async fn post(client: &reqwest::Client, url: &str, body: &Value) -> Result<Value, String> {
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(body)
        .send()
        .await
        .map_err(|e| format!("request to {url} failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| format!("failed reading response body from {url}: {e}"))?;
    if !status.is_success() {
        let snippet = &text[..text.len().min(300)];
        return Err(format!("{url} returned HTTP {status}: {snippet}"));
    }
    let parsed: Value =
        serde_json::from_str(&text).map_err(|e| format!("failed to parse JSON response from {url}: {e}"))?;

    // HTTP 200 doesn't guarantee app-level success - surface eventResult failures explicitly
    // rather than letting a downstream call fail confusingly on missing data.
    if parsed["eventResult"]["eventResultType"] != "SUCCESS" {
        return Err(format!("{url} returned an application error: {parsed}"));
    }
    Ok(parsed)
}

// APP_START -> CONNECT, matching the real client's boot sequence (confirmed via Proxyman capture).
// CONNECT exchanges the account's clientSecret/snowId for a sessionId; every authenticated call
// after that uses the sessionId-suffixed URL. Returns the sessionId, which both GET_PLAYER and the
// guild-chat commands authenticate with.
pub(crate) async fn connect(
    client: &reqwest::Client,
    config: &EnvironmentConfig,
    user_id: &str,
    client_secret: &str,
    snow_id: &str,
) -> Result<String, String> {
    let base_url = format!("{}/{user_id}", config.base_url);

    let app_start_body = envelope(
        "APP_START",
        json!({
            "appId": "loki",
            "apiVersion": "0.1",
            "os": "Linux",
            "deviceType": "server",
            "deviceName": "scraper",
            "deviceId": "scraper",
            "locale": "en_US",
            "userId": user_id,
            "appVersion": "1.21.46.689",
            "universeVersion": "universe_not_needed",
            "installId": INSTALL_ID,
            "platform": "Linux",
            "store": "Server",
            "countryCode": "US",
        }),
        config,
    );
    post(client, &base_url, &app_start_body).await?;

    let mut connect_data = json!({
        "userId": user_id,
        "clientSecret": client_secret,
        "deviceData": {
            "installId": INSTALL_ID,
            "deviceId": "scraper",
            "countryCode": "US",
            "locale": "en_US",
            "manufacturer": "scraper",
            "model": "scraper",
            "os": "Linux",
            "buildString": "1.21.46.689",
            "screenWidth": 1920,
            "screenHeight": 1080,
            "platform": "Linux",
            "store": "Server",
            "distribution": "Desktop",
            "ram": 8192,
            "environmentId": config.environment_id,
            "jenkinsBuildBranchInfo": config.jenkins_build_branch_info,
            "bundleId": config.bundle_id,
            "graphicsDeviceName": "None",
            "graphicsShaderLevel": 0,
            "graphicsMemorySize": 0,
            "processorType": "scraper",
            "supportedTextureFormats": "None",
        }
    });
    // QA's credentials file has no snowId at all, and a real captured QA CONNECT request omits
    // the field entirely rather than sending it empty - match that instead of sending "".
    if !snow_id.is_empty() {
        connect_data["snowId"] = json!(snow_id);
    }
    let connect_body = envelope("CONNECT", connect_data, config);
    let connect_response = post(client, &base_url, &connect_body).await?;
    connect_response["eventResult"]["eventResponseData"]["userData"]["sessionId"]
        .as_str()
        .ok_or_else(|| "CONNECT response didn't contain a sessionId - is clientSecret/snowId correct?".to_string())
        .map(|s| s.to_string())
}

// A single authenticated player event on an already-established session.
pub(crate) async fn player_event(
    client: &reqwest::Client,
    config: &EnvironmentConfig,
    user_id: &str,
    session_id: &str,
    player_event_type: &str,
    player_event_data: Value,
) -> Result<Value, String> {
    let session_url = format!("{}/{user_id}/sessionId/{session_id}", config.base_url);
    let body = envelope(player_event_type, player_event_data, config);
    post(client, &session_url, &body).await
}

// GET_PLAYER returns the player's full state (roster, resources, progress - including the
// expeditions board), not anything specific to a particular live event.
#[tauri::command]
pub async fn fetch_player_data(
    environment: String,
    user_id: String,
    client_secret: String,
    snow_id: String,
) -> Result<Value, String> {
    let config = environment_config(&environment)?;
    let client = reqwest::Client::new();
    let session_id = connect(&client, config, &user_id, &client_secret, &snow_id).await?;
    player_event(
        &client,
        config,
        &user_id,
        &session_id,
        "GET_PLAYER",
        json!({ "storefrontCountryCode": "NotAvailable" }),
    )
    .await
}
