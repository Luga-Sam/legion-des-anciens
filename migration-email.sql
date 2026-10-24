ALTER TABLE membres ADD COLUMN email_verifie INTEGER NOT NULL DEFAULT 0;

UPDATE membres SET email_verifie = 1 WHERE role IN ('membre', 'officier');

CREATE TABLE IF NOT EXISTS verifications (
  token_hash TEXT PRIMARY KEY,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS verifications_membre_idx ON verifications (membre_id);
