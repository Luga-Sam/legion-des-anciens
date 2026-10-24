-- À exécuter UNE SEULE FOIS dans Cloudflare > Storage & databases > D1 > legion-des-anciens > Console,
-- AVANT de publier la nouvelle version du site.

ALTER TABLE membres ADD COLUMN grade TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS chroniques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL CHECK (length(titre) <= 120),
  extrait TEXT NOT NULL DEFAULT '' CHECK (length(extrait) <= 300),
  contenu TEXT NOT NULL CHECK (length(contenu) <= 12000),
  image TEXT NOT NULL DEFAULT '' CHECK (length(image) <= 500),
  auteur_id INTEGER REFERENCES membres(id) ON DELETE SET NULL,
  auteur_pseudo TEXT NOT NULL,
  publie INTEGER NOT NULL DEFAULT 0,
  publie_le INTEGER,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch()),
  maj_le INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS chroniques_date_idx ON chroniques (publie, publie_le);

CREATE TABLE IF NOT EXISTS chronique_commentaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chronique_id INTEGER NOT NULL REFERENCES chroniques(id) ON DELETE CASCADE,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL CHECK (length(contenu) <= 600),
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS chronique_commentaires_idx ON chronique_commentaires (chronique_id);
