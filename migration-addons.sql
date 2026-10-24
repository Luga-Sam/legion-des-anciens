-- À exécuter UNE SEULE FOIS dans Cloudflare > Storage & databases > D1 > legion-des-anciens > Console,
-- avant (ou juste après) la mise en ligne de la page Addons.

CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL CHECK (length(nom) <= 60),
  categorie TEXT NOT NULL CHECK (length(categorie) <= 40),
  niveau TEXT NOT NULL DEFAULT 'recommande' CHECK (niveau IN ('obligatoire','recommande','confort')),
  description TEXT NOT NULL CHECK (length(description) <= 600),
  lien TEXT NOT NULL CHECK (length(lien) <= 500),
  cree_par INTEGER REFERENCES membres(id) ON DELETE SET NULL,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch()),
  maj_le INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS addons_categorie_idx ON addons (categorie);
