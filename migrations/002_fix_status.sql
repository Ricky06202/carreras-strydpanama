-- Drop and recreate races table with correct status values
CREATE TABLE races_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_timestamp INTEGER,
  location TEXT,
  route_gpx_url TEXT,
  price INTEGER DEFAULT 0,
  max_participants INTEGER,
  status TEXT DEFAULT 'upcoming',
  timer_start INTEGER,
  timer_stop INTEGER,
  image_url TEXT,
  technical_info TEXT,
  terms_and_conditions TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Copy data
INSERT INTO races_new SELECT * FROM races;

-- Drop old table
DROP TABLE races;

-- Rename new table
ALTER TABLE races_new RENAME TO races;
