ALTER TABLE admin_sessions ADD COLUMN email TEXT;
-- Integraciones MCP: consentimiento por administrador y tokens revocables.
CREATE TABLE IF NOT EXISTS mcp_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mcp_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  account_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mcp_tokens (
  token_hash TEXT PRIMARY KEY,
  refresh_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  access_expires INTEGER NOT NULL,
  refresh_expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mcp_tokens_account_idx ON mcp_tokens(account_id,refresh_expires);
