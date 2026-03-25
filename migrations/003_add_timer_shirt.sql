-- Add show_timer and show_shirt_size to races
ALTER TABLE races ADD COLUMN show_timer INTEGER DEFAULT 0;
ALTER TABLE races ADD COLUMN show_shirt_size INTEGER DEFAULT 1;
