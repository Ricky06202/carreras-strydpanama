-- Tabla de Carreras
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_timestamp INTEGER,
  location TEXT,
  route_gpx_url TEXT,
  price INTEGER DEFAULT 0,
  max_participants INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'completed')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Tabla de Categorías por Carrera
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE
);

-- Tabla de Participantes
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
  size TEXT,
  code_id TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
  registered_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (code_id) REFERENCES registration_codes(id)
);

-- Códigos de Inscripción
CREATE TABLE IF NOT EXISTS registration_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  race_id TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  used_by_participant_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE
);

-- Transacciones Yappy
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  yappy_order_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_participants_race ON participants(race_id);
CREATE INDEX IF NOT EXISTS idx_participants_category ON participants(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_race ON categories(race_id);
CREATE INDEX IF NOT EXISTS idx_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_transactions_participant ON transactions(participant_id);