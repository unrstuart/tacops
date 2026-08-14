import type { Credentials, Environment } from "../api/types";
import {
  guildFeedInit,
  readChannelWindow,
  type ChannelName,
  type GuildFeedInit,
  type RawChannelEvent,
} from "../api/guild-chat";

/**
 * Scrollback over a guild's two channels, `guild` (guild events) and `guildchat` (chat + shared
 * replays). They are independent seq spaces that the server answers with DIFFERENT window mechanics:
 *
 *   - guildchat: a fixed ~220-event slice starting ~1710 seqs ABOVE the requested seq. To reach the
 *     newest events you request near `top - 1930`; older pages come from decreasing the seq.
 *   - guild: forward pages — a request at S returns the events just after S up to the newest (a big
 *     window, capped ~1250). A SMALL margin below `top` reaches the newest; a large one caps short.
 *
 * Because the mechanics and densities differ, each channel is set up by a "reach the top" discovery
 * that finds a starting seq whose window includes the newest events, whichever mechanic applies.
 * History is then read by probing overlapping windows at decreasing seqs and merging by (channel,
 * seq). To keep the merged feed consistent as the user pages back, the `guild` channel anchors each
 * step and `guildchat` is read back to the same timestamp — so every "load older" only adds events
 * OLDER than what's shown. When guildchat runs out of retained history first (a read stops adding
 * anything new), it's marked exhausted so the UI can show where chat history ends.
 */

/** Seqs advanced per probe: below the guildchat window width (~220) so consecutive windows overlap. */
const STEP = 200;
/** Guild events to add per "load older" — the step that sets the timestamp guildchat aligns to. */
const GUILD_BATCH = 150;
/** Small initial margin below the newest seq: reaches the top for guild; discovery widens it for guildchat. */
const INITIAL_MARGIN = 250;
/** Extra seqs to drop when the initial margin lands above the top (a channel with a large offset). */
const LOWER_STEP = 1000;
/** A window whose newest seq is within this of `top` counts as reaching the newest events. */
const REACH_SLACK = 60;
/** Max probes while discovering a channel's newest window. */
const MAX_DISCOVERY = 12;
/** Consecutive empty windows before a channel is treated as out of retained history. */
const EMPTY_STREAK_DONE = 5;
/** Consecutive windows that add nothing new before a (forward-paging) channel is treated as exhausted. */
const NO_NEW_DONE = 2;
/** Safety cap on windows read in a single channel walk. */
const MAX_WINDOWS = 24;

interface ChannelCursor {
  channel: ChannelName;
  /** The next seq to probe (walking downward). */
  nextSeq: number;
  done: boolean;
}

export interface GuildFeed {
  guildId: string;
  guildName: string | null;
  guildTag: string | null;
  channels: ChannelName[];
  cursors: ChannelCursor[];
  /** Merged, deduped, ascending by timestamp (oldest first, newest last). */
  events: RawChannelEvent[];
  /** True once every channel has run out of retained history. */
  exhausted: boolean;
  /** True once the guildchat channel specifically has no older history left. */
  chatExhausted: boolean;
  /** Oldest guildchat timestamp loaded — where the "start of chat history" marker sits. */
  chatOldestTimestamp: number | null;
}

export interface LoadProgress {
  collected: number;
}

export async function initGuildFeed(
  environment: Environment,
  credentials: Credentials,
  channels: ChannelName[],
  guildId?: string,
  onProgress?: (progress: LoadProgress) => void,
): Promise<GuildFeed> {
  const info = await guildFeedInit(environment, credentials, guildId);
  const merged = new Map<string, RawChannelEvent>();
  const report = () => onProgress?.({ collected: merged.size });

  const cursors = await Promise.all(
    channels.map((channel) =>
      discoverNewest(
        environment,
        credentials,
        info.guildId,
        channel,
        info.seqs[channel],
        merged,
        report,
      ),
    ),
  );

  const feed = toFeed(info, channels, cursors, merged);
  // One aligned step so the first view already has both channels back to a common time.
  return collectOlder(environment, credentials, feed, onProgress);
}

export async function loadOlderEvents(
  environment: Environment,
  credentials: Credentials,
  feed: GuildFeed,
  onProgress?: (progress: LoadProgress) => void,
): Promise<GuildFeed> {
  return collectOlder(environment, credentials, feed, onProgress);
}

/**
 * Finds a starting window that includes a channel's newest events, whatever window mechanic the
 * channel uses. It starts a small margin below `top`; if that lands above the newest event (an empty
 * window, i.e. a large-offset channel like guildchat) it drops lower, and if it lands below the
 * newest it nudges the request up until the window's newest seq reaches `top`. Adds the found window
 * to `merged` and returns a cursor to continue below it.
 */
async function discoverNewest(
  environment: Environment,
  credentials: Credentials,
  guildId: string,
  channel: ChannelName,
  top: number | null,
  merged: Map<string, RawChannelEvent>,
  report: () => void,
): Promise<ChannelCursor> {
  if (top == null) {
    return { channel, nextSeq: 0, done: true };
  }

  let seq = Math.max(top - INITIAL_MARGIN, 0);
  let best: { seq: number; window: RawChannelEvent[]; max: number } | null =
    null;

  for (let attempt = 0; attempt < MAX_DISCOVERY; attempt += 1) {
    const window = await readChannelWindow(
      environment,
      credentials,
      guildId,
      channel,
      seq,
    );
    report();
    if (window.length === 0) {
      if (seq <= 0) break;
      seq = Math.max(seq - LOWER_STEP, 0);
      continue;
    }
    const max = maxSeq(window);
    if (best == null || max > best.max) best = { seq, window, max };
    if (max >= top - REACH_SLACK) break;
    const next = Math.min(seq + (top - max), top - 1);
    if (next <= seq) break;
    seq = next;
  }

  if (best == null) {
    return { channel, nextSeq: 0, done: true };
  }
  addAll(merged, best.window);
  return { channel, nextSeq: Math.max(best.seq - STEP, 0), done: false };
}

async function collectOlder(
  environment: Environment,
  credentials: Credentials,
  feed: GuildFeed,
  onProgress?: (progress: LoadProgress) => void,
): Promise<GuildFeed> {
  const merged = new Map(feed.events.map((event) => [eventKey(event), event]));
  const startingSize = merged.size;
  const report = () => onProgress?.({ collected: merged.size - startingSize });
  const cursors = new Map(
    feed.cursors.map((cursor) => [cursor.channel, cursor]),
  );

  const guild = cursors.get("guild");
  const chat = cursors.get("guildchat");

  if (guild && !guild.done) {
    // Guild anchors the step; guildchat then catches up to guild's new oldest timestamp.
    cursors.set(
      "guild",
      await walkByCount(
        environment,
        credentials,
        feed.guildId,
        guild,
        merged,
        GUILD_BATCH,
        report,
      ),
    );
    const targetTimestamp = oldestTimestamp(merged, "guild");
    if (chat && !chat.done && targetTimestamp != null) {
      cursors.set(
        "guildchat",
        await walkToTimestamp(
          environment,
          credentials,
          feed.guildId,
          chat,
          merged,
          targetTimestamp,
          report,
        ),
      );
    }
  } else if (chat && !chat.done) {
    // Guild history is exhausted, so there's no anchor left — let guildchat page on its own.
    cursors.set(
      "guildchat",
      await walkByCount(
        environment,
        credentials,
        feed.guildId,
        chat,
        merged,
        GUILD_BATCH,
        report,
      ),
    );
  }

  return toFeed(feed, feed.channels, [...cursors.values()], merged);
}

/** Reads windows downward until `target` new events have been added (or the channel is exhausted). */
async function walkByCount(
  environment: Environment,
  credentials: Credentials,
  guildId: string,
  cursor: ChannelCursor,
  merged: Map<string, RawChannelEvent>,
  target: number,
  report: () => void,
): Promise<ChannelCursor> {
  let added = 0;
  return walkDown(
    environment,
    credentials,
    guildId,
    cursor,
    merged,
    report,
    (addedThisWindow) => {
      added += addedThisWindow;
      return added < target;
    },
  );
}

/** Reads windows downward until the channel's oldest loaded event is at/older than `targetTimestamp`. */
async function walkToTimestamp(
  environment: Environment,
  credentials: Credentials,
  guildId: string,
  cursor: ChannelCursor,
  merged: Map<string, RawChannelEvent>,
  targetTimestamp: number,
  report: () => void,
): Promise<ChannelCursor> {
  return walkDown(
    environment,
    credentials,
    guildId,
    cursor,
    merged,
    report,
    () => {
      const oldest = oldestTimestamp(merged, cursor.channel);
      return oldest == null || oldest > targetTimestamp;
    },
  );
}

/**
 * Shared downward walk: reads overlapping windows at decreasing seqs, merging events, until
 * `keepGoing(addedThisWindow)` returns false or the channel runs out. A channel is exhausted when a
 * run of windows comes back empty (guildchat's end) or stops adding anything new (guild's end).
 */
async function walkDown(
  environment: Environment,
  credentials: Credentials,
  guildId: string,
  cursor: ChannelCursor,
  merged: Map<string, RawChannelEvent>,
  report: () => void,
  keepGoing: (addedThisWindow: number) => boolean,
): Promise<ChannelCursor> {
  if (cursor.done) {
    return cursor;
  }
  let seq = cursor.nextSeq;
  let emptyStreak = 0;
  let noNewStreak = 0;
  for (
    let iterations = 0;
    seq >= 0 && iterations < MAX_WINDOWS;
    iterations += 1
  ) {
    const window = await readChannelWindow(
      environment,
      credentials,
      guildId,
      cursor.channel,
      seq,
    );
    let added = 0;
    for (const event of window) {
      const key = eventKey(event);
      if (!merged.has(key)) added += 1;
      merged.set(key, event);
    }
    emptyStreak = window.length === 0 ? emptyStreak + 1 : 0;
    noNewStreak = window.length > 0 && added === 0 ? noNewStreak + 1 : 0;
    report();
    seq -= STEP;
    if (emptyStreak >= EMPTY_STREAK_DONE || noNewStreak >= NO_NEW_DONE) {
      return { channel: cursor.channel, nextSeq: Math.max(seq, 0), done: true };
    }
    if (added > 0 && !keepGoing(added)) {
      break;
    }
  }
  return { channel: cursor.channel, nextSeq: Math.max(seq, 0), done: seq < 0 };
}

function toFeed(
  info: Pick<GuildFeedInit, "guildId" | "guildName" | "guildTag"> &
    Partial<GuildFeed>,
  channels: ChannelName[],
  cursors: ChannelCursor[],
  merged: Map<string, RawChannelEvent>,
): GuildFeed {
  return {
    guildId: info.guildId,
    guildName: info.guildName,
    guildTag: info.guildTag,
    channels,
    cursors,
    events: [...merged.values()].sort(byTimestamp),
    exhausted: cursors.every((cursor) => cursor.done),
    chatExhausted:
      cursors.find((cursor) => cursor.channel === "guildchat")?.done ?? true,
    chatOldestTimestamp: oldestTimestamp(merged, "guildchat"),
  };
}

function addAll(
  merged: Map<string, RawChannelEvent>,
  events: RawChannelEvent[],
) {
  for (const event of events) {
    merged.set(eventKey(event), event);
  }
}

function oldestTimestamp(
  merged: Map<string, RawChannelEvent>,
  channel: ChannelName,
): number | null {
  let oldest: number | null = null;
  for (const event of merged.values()) {
    if (event.channel !== channel || event.timestamp == null) continue;
    if (oldest == null || event.timestamp < oldest) oldest = event.timestamp;
  }
  return oldest;
}

function maxSeq(events: RawChannelEvent[]): number {
  return events.reduce((max, event) => Math.max(max, event.seq), 0);
}

function eventKey(event: RawChannelEvent): string {
  return `${event.channel}:${event.seq}`;
}

function byTimestamp(a: RawChannelEvent, b: RawChannelEvent): number {
  return (a.timestamp ?? 0) - (b.timestamp ?? 0);
}
