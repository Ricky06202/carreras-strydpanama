-- Add team fields and finish time
ALTER TABLE participants ADD COLUMN team_name TEXT;
ALTER TABLE participants ADD COLUMN team_id TEXT;
ALTER TABLE participants ADD COLUMN team_position INTEGER;
ALTER TABLE participants ADD COLUMN finish_time INTEGER;
