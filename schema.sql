CREATE TABLE IF NOT EXISTS membres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pseudo TEXT NOT NULL CHECK (length(pseudo) BETWEEN 2 AND 24),
  mdp_hash TEXT NOT NULL,
  mdp_sel TEXT NOT NULL,
  mdp_iter INTEGER NOT NULL DEFAULT 100000,
  mdp_temporaire INTEGER NOT NULL DEFAULT 0,
  email_verifie INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'en_attente' CHECK (role IN ('en_attente','membre','officier','refuse')),
  grade TEXT NOT NULL DEFAULT '',
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS sessions_membre_idx ON sessions (membre_id);

CREATE TABLE IF NOT EXISTS personnages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  nom TEXT NOT NULL CHECK (length(nom) BETWEEN 2 AND 24),
  classe TEXT NOT NULL CHECK (classe IN ('Guerrier','Paladin','Chasseur','Voleur','Prêtre','Chamane','Mage','Démoniste','Druide')),
  specialisation TEXT NOT NULL CHECK (length(specialisation) BETWEEN 2 AND 40),
  role TEXT NOT NULL CHECK (role IN ('tank','soigneur','dps')),
  niveau INTEGER NOT NULL DEFAULT 1 CHECK (niveau BETWEEN 1 AND 90),
  metier1 TEXT CHECK (metier1 IS NULL OR length(metier1) <= 30),
  metier2 TEXT CHECK (metier2 IS NULL OR length(metier2) <= 30),
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS personnages_membre_idx ON personnages (membre_id);

CREATE TABLE IF NOT EXISTS raids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL CHECK (length(titre) BETWEEN 2 AND 60),
  date_raid TEXT NOT NULL,
  rassemblement TEXT NOT NULL,
  debut TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  tank INTEGER NOT NULL DEFAULT 2 CHECK (tank BETWEEN 0 AND 40),
  soigneur INTEGER NOT NULL DEFAULT 4 CHECK (soigneur BETWEEN 0 AND 40),
  dps INTEGER NOT NULL DEFAULT 4 CHECK (dps BETWEEN 0 AND 40),
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert','complet','annule')),
  archive INTEGER NOT NULL DEFAULT 0,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS inscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raid_id INTEGER NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  personnage_id INTEGER NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tank','soigneur','dps')),
  presence TEXT NOT NULL CHECK (presence IN ('present','retard','absent')),
  heure TEXT,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 120),
  etat TEXT NOT NULL DEFAULT 'attente' CHECK (etat IN ('attente','confirme','remplacant')),
  cree_le INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (raid_id, personnage_id)
);

CREATE INDEX IF NOT EXISTS inscriptions_raid_idx ON inscriptions (raid_id);

CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  maj_le INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tentatives (
  cle TEXT PRIMARY KEY,
  nb INTEGER NOT NULL,
  debut INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  token_hash TEXT PRIMARY KEY,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS verifications_membre_idx ON verifications (membre_id);

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
