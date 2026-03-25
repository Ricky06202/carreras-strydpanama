-- Add new columns to races table
ALTER TABLE races ADD COLUMN image_url TEXT;
ALTER TABLE races ADD COLUMN technical_info TEXT;
ALTER TABLE races ADD COLUMN terms_and_conditions TEXT;

-- Add new columns to participants table
ALTER TABLE participants ADD COLUMN distance_id TEXT;
ALTER TABLE participants ADD COLUMN terms_accepted INTEGER DEFAULT 0;

-- Create distances table
CREATE TABLE IF NOT EXISTS distances (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
