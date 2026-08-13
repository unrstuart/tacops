-- Migration number: 0001 	 2026-08-13T09:38:51.624Z

CREATE TABLE user_sightings (
  user_hash TEXT PRIMARY KEY,
  last_seen_date TEXT NOT NULL -- 'YYYY-MM-DD', UTC
);
