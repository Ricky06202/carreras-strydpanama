ALTER TABLE payments ADD COLUMN mcp_import_key TEXT;
CREATE UNIQUE INDEX payments_mcp_import_key_idx ON payments (mcp_import_key);

CREATE TABLE mcp_registration_imports (
  approval_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  payload_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  committed_at TEXT
);
CREATE INDEX mcp_registration_imports_expiry_idx ON mcp_registration_imports (expires_at);
