-- Carreras STRYD Panama - Schema

-- Users (SonicJS)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Content (SonicJS)
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Carreras STRYD Panama Tables
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  start_timestamp INTEGER,
  location TEXT,
  route_gpx_url TEXT,
  route_geojson TEXT,
  image_url TEXT,
  technical_info TEXT,
  terms_and_conditions TEXT,
  price INTEGER DEFAULT 0,
  max_participants INTEGER,
  status TEXT DEFAULT 'upcoming',
  timer_start INTEGER,
  timer_stop INTEGER,
  show_timer INTEGER DEFAULT 0,
  show_shirt_size INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS distances (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birth_date TEXT,
  gender TEXT,
  category_id TEXT,
  distance_id TEXT,
  team_name TEXT,
  team_id TEXT,
  bib_number INTEGER,
  size TEXT,
  cedula TEXT,
  country TEXT,
  code_id TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  terms_accepted INTEGER DEFAULT 0,
  finish_time INTEGER,
  registered_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS registration_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  race_id TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  used_by_participant_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  yappy_order_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS running_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_approved INTEGER NOT NULL DEFAULT 0
);

-- Sample data
INSERT OR IGNORE INTO races (id, name, description, date, location, price, status, image_url) VALUES
('race-1', 'Carrera STRYD 10K', 'Carrera de 10 kilómetros por la ciudad', '2026-04-15', 'Ciudad de Panamá', 25, 'accepting', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'),
('race-2', 'Media Maratón Panama', 'Media maratón internacional', '2026-05-20', 'Cinta Costera', 45, 'upcoming', 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800');

INSERT OR IGNORE INTO distances (id, race_id, name) VALUES
('dist-1', 'race-1', '5K'),
('dist-2', 'race-1', '10K'),
('dist-3', 'race-2', '10K'),
('dist-4', 'race-2', '21K');

INSERT OR IGNORE INTO categories (id, race_id, name) VALUES
('cat-1', 'race-1', 'Masculino'),
('cat-2', 'race-1', 'Femenino'),
('cat-3', 'race-2', 'Masculino'),
('cat-4', 'race-2', 'Femenino');
