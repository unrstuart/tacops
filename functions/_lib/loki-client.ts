// Ported 1:1 from src-tauri/src/loki.rs - keep the two in sync. This is the CORS-workaround proxy
// the web build needs in place of that Rust code (a browser can't call Snowprint directly).

// Confirmed via real Proxyman captures: the actual game client reuses this exact trio unchanged
// across APP_START, CONNECT, and GET_PLAYER in the same session - not re-derived per call. Same
// values on both prod and QA.
const GAME_CONFIG_VERSION = "f92fb06ae9c02542bb3f520fc562f709";
const MULTI_CONFIG_VERSION = "897f8de5439de707acaf6b3add1eeba3";
const INSTALL_ID = "scraper-installid";

interface EnvironmentConfig {
  baseUrl: string;
  environmentId: string;
  bundleId: string;
  jenkinsBuildBranchInfo: string;
  builtInMultiConfigVersion: string;
}

// The fields below come straight from a real captured QA CONNECT request and differ from prod.
// Device/hardware fingerprint fields (os, model, screen size, graphics, ram, ...) are deliberately
// left as generic scraper values on both environments instead of mirrored from that capture - prod
// already works fine with fully fake device data, so there's no evidence the backend validates them.
const PROD_CONFIG: EnvironmentConfig = {
  baseUrl: "https://api-live.loki.snowprintstudios.com/player/player2/userId",
  environmentId: "live-loki",
  bundleId: "com.snowprintstudios.tacticus",
  jenkinsBuildBranchInfo: "release",
  builtInMultiConfigVersion: "f34892307c9d4727869adf53f3afa446",
};

const QA_CONFIG: EnvironmentConfig = {
  baseUrl: "https://api-staging.loki.snowprintstudios.com/player/player2/userId",
  environmentId: "staging-loki",
  bundleId: "com.snowprintstudios.loki.qa",
  jenkinsBuildBranchInfo: "staging",
  builtInMultiConfigVersion: "34c80d71f65bd74deb6ba74f01d1c725",
};

function environmentConfig(environment: string): EnvironmentConfig {
  if (environment === "prod") return PROD_CONFIG;
  if (environment === "qa") return QA_CONFIG;
  throw new Error(`Unknown environment: ${environment}`);
}

function envelope(playerEventType: string, playerEventData: unknown, config: EnvironmentConfig) {
  return {
    playerEvent: {
      playerEventType,
      playerEventData,
      universeVersion: "universe_not_needed",
      gameConfigVersion: GAME_CONFIG_VERSION,
      createdOn: String(Date.now()),
      multiConfigVersion: MULTI_CONFIG_VERSION,
    },
    builtInMultiConfigVersion: config.builtInMultiConfigVersion,
    installId: INSTALL_ID,
  };
}

async function post(url: string, body: unknown): Promise<any> {
  // Without an explicit timeout, a stalled connection would hang the request forever - matches
  // the 20s reqwest timeout on the Rust side, added after a real hung request froze the whole app.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  }).catch((e) => {
    throw new Error(`request to ${url} failed: ${e}`);
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${url} returned HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`failed to parse JSON response from ${url}: ${e}`);
  }

  // HTTP 200 doesn't guarantee app-level success - surface eventResult failures explicitly rather
  // than letting a downstream call fail confusingly on missing data.
  if (parsed?.eventResult?.eventResultType !== "SUCCESS") {
    throw new Error(`${url} returned an application error: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

// APP_START -> CONNECT -> GET_PLAYER, matching the real client's boot sequence (confirmed via
// Proxyman capture). CONNECT exchanges the account's clientSecret/snowId for a sessionId; every
// call after that uses the sessionId-suffixed URL. GET_PLAYER needs no dynamic parameters at all
// and returns the player's full state (roster, resources, progress - including the expeditions
// board), not anything specific to a particular live event.
export async function fetchPlayerDataFromLoki(
  environment: string,
  userId: string,
  clientSecret: string,
  snowId: string,
): Promise<unknown> {
  const config = environmentConfig(environment);
  const baseUrl = `${config.baseUrl}/${userId}`;

  const appStartBody = envelope(
    "APP_START",
    {
      appId: "loki",
      apiVersion: "0.1",
      os: "Linux",
      deviceType: "server",
      deviceName: "scraper",
      deviceId: "scraper",
      locale: "en_US",
      userId,
      appVersion: "1.21.46.689",
      universeVersion: "universe_not_needed",
      installId: INSTALL_ID,
      platform: "Linux",
      store: "Server",
      countryCode: "US",
    },
    config,
  );
  await post(baseUrl, appStartBody);

  const connectData: Record<string, unknown> = {
    userId,
    clientSecret,
    deviceData: {
      installId: INSTALL_ID,
      deviceId: "scraper",
      countryCode: "US",
      locale: "en_US",
      manufacturer: "scraper",
      model: "scraper",
      os: "Linux",
      buildString: "1.21.46.689",
      screenWidth: 1920,
      screenHeight: 1080,
      platform: "Linux",
      store: "Server",
      distribution: "Desktop",
      ram: 8192,
      environmentId: config.environmentId,
      jenkinsBuildBranchInfo: config.jenkinsBuildBranchInfo,
      bundleId: config.bundleId,
      graphicsDeviceName: "None",
      graphicsShaderLevel: 0,
      graphicsMemorySize: 0,
      processorType: "scraper",
      supportedTextureFormats: "None",
    },
  };
  // QA's credentials file has no snowId at all, and a real captured QA CONNECT request omits the
  // field entirely rather than sending it empty - match that instead of sending "".
  if (snowId) connectData.snowId = snowId;

  const connectBody = envelope("CONNECT", connectData, config);
  const connectResponse = await post(baseUrl, connectBody);
  const sessionId = connectResponse?.eventResult?.eventResponseData?.userData?.sessionId;
  if (!sessionId) {
    throw new Error("CONNECT response didn't contain a sessionId - is clientSecret/snowId correct?");
  }

  const sessionUrl = `${baseUrl}/sessionId/${sessionId}`;
  const getPlayerBody = envelope("GET_PLAYER", { storefrontCountryCode: "NotAvailable" }, config);
  return post(sessionUrl, getPlayerBody);
}
