-- Correo verificado por RS ID, cuando NO coincide con runners.email.
-- Sirve para reconocer al corredor en el siguiente canje sin duplicar cuenta.
ALTER TABLE runners ADD COLUMN rsid_email TEXT;
CREATE INDEX IF NOT EXISTS runners_rsid_email_idx ON runners (rsid_email);
