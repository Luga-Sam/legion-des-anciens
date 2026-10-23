-- =====================================================================
--  La Légion des Anciens : base de données Cloudflare D1
--  À coller EN ENTIER dans Cloudflare > Storage & databases > D1 > votre base > Console, puis « Execute ».
--  Vous pouvez le relancer sans risque : il ne casse rien s'il existe déjà.
-- =====================================================================

-- Membres du site (comptes). Les mots de passe ne sont JAMAIS stockés en clair : seulement leur empreinte.
CREATE TABLE IF NOT EXISTS membres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pseudo TEXT NOT NULL CHECK (length(pseudo) BETWEEN 2 AND 24),
  mdp_hash TEXT NOT NULL,
  mdp_sel TEXT NOT NULL,
  mdp_iter INTEGER NOT NULL DEFAULT 100000,
  mdp_temporaire INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'en_attente' CHECK (role IN ('en_attente','membre','officier','refuse')),
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Connexions en cours (on ne garde que l'empreinte du jeton, jamais le jeton lui-même)
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  membre_id INTEGER NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  expire_le INTEGER NOT NULL,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS sessions_membre_idx ON sessions (membre_id);

-- Fiches personnages (Armurerie)
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

-- Raids du calendrier
CREATE TABLE IF NOT EXISTS raids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL CHECK (length(titre) BETWEEN 2 AND 60),
  date_raid TEXT NOT NULL,                      -- AAAA-MM-JJ
  rassemblement TEXT NOT NULL,                  -- HH:MM
  debut TEXT NOT NULL,                          -- HH:MM
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  tank INTEGER NOT NULL DEFAULT 2 CHECK (tank BETWEEN 0 AND 40),
  soigneur INTEGER NOT NULL DEFAULT 4 CHECK (soigneur BETWEEN 0 AND 40),
  dps INTEGER NOT NULL DEFAULT 4 CHECK (dps BETWEEN 0 AND 40),
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert','complet','annule')),
  archive INTEGER NOT NULL DEFAULT 0,
  cree_le INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Inscriptions des personnages aux raids
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

-- Réglages du site (annonce, recrutement, progression) et petites données techniques
CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  maj_le INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Compteur anti-abus (tentatives de connexion et de création de compte)
CREATE TABLE IF NOT EXISTS tentatives (
  cle TEXT PRIMARY KEY,
  nb INTEGER NOT NULL,
  debut INTEGER NOT NULL
);

-- =====================================================================
--  ÉTAPE FINALE : devenir officier
--  1) Créez votre compte sur le site (bouton « Connexion / S'inscrire »).
--  2) Remplacez l'adresse ci-dessous par la vôtre, retirez les deux « -- » au début des deux
--     lignes, puis exécutez uniquement ces deux lignes dans la Console D1 :
--
-- UPDATE membres SET role = 'officier' WHERE email = 'votre@email.com';
-- SELECT id, email, pseudo, role FROM membres;
-- =====================================================================
