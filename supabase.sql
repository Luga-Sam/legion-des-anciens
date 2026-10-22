-- =====================================================================
--  La Légion des Anciens : base de données (Supabase)
--  À coller EN ENTIER dans Supabase > SQL Editor > New query, puis « Run ».
--  Vous pouvez le relancer sans risque : il ne casse rien s'il existe déjà.
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 2 and 24),
  role text not null default 'en_attente' check (role in ('en_attente','membre','officier','refuse')),
  cree_le timestamptz not null default now()
);

create table if not exists public.personnages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nom text not null check (char_length(nom) between 2 and 24),
  classe text not null check (classe in ('Guerrier','Paladin','Chasseur','Voleur','Prêtre','Chamane','Mage','Démoniste','Druide')),
  specialisation text not null check (char_length(specialisation) between 2 and 40),
  role text not null check (role in ('tank','soigneur','dps')),
  niveau int not null default 1 check (niveau between 1 and 90),
  metier1 text check (char_length(metier1) <= 30),
  metier2 text check (char_length(metier2) <= 30),
  cree_le timestamptz not null default now()
);
create index if not exists personnages_user_idx on public.personnages (user_id);

create table if not exists public.raids (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (char_length(titre) between 2 and 60),
  date_raid date not null,
  rassemblement time not null,
  debut time not null,
  description text not null default '' check (char_length(description) <= 300),
  tank int not null default 2 check (tank between 0 and 40),
  soigneur int not null default 4 check (soigneur between 0 and 40),
  dps int not null default 4 check (dps between 0 and 40),
  statut text not null default 'ouvert' check (statut in ('ouvert','complet','annule')),
  archive boolean not null default false,
  cree_le timestamptz not null default now()
);

create table if not exists public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids(id) on delete cascade,
  personnage_id uuid not null references public.personnages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('tank','soigneur','dps')),
  presence text not null check (presence in ('present','retard','absent')),
  heure time,
  note text not null default '' check (char_length(note) <= 120),
  etat text not null default 'attente' check (etat in ('attente','confirme','remplacant')),
  cree_le timestamptz not null default now(),
  unique (raid_id, personnage_id)
);
create index if not exists inscriptions_raid_idx on public.inscriptions (raid_id);

-- ---------- Qui est qui ? (fonctions utilisées par les règles de sécurité) ----------
create or replace function public.role_courant() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.role_courant() in ('membre','officier'), false) $$;

create or replace function public.est_officier() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.role_courant() = 'officier', false) $$;

-- ---------- Création automatique du profil à l'inscription (en attente de validation) ----------
create or replace function public.nouveau_profil() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text;
begin
  p := left(coalesce(nullif(trim(new.raw_user_meta_data->>'pseudo'), ''), split_part(new.email, '@', 1)), 24);
  if char_length(p) < 2 then p := 'Membre'; end if;
  insert into public.profiles (id, pseudo) values (new.id, p);
  return new;
end $$;

drop trigger if exists sur_nouvel_utilisateur on auth.users;
create trigger sur_nouvel_utilisateur after insert on auth.users
  for each row execute function public.nouveau_profil();

-- ---------- Un membre ne peut pas se valider lui-même dans un raid ----------
create or replace function public.garde_inscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_officier() then
    new.etat := old.etat;
    new.raid_id := old.raid_id;
    new.user_id := old.user_id;
    new.personnage_id := old.personnage_id;
  end if;
  return new;
end $$;

drop trigger if exists garde_inscription on public.inscriptions;
create trigger garde_inscription before update on public.inscriptions
  for each row execute function public.garde_inscription();

-- ---------- Règles de sécurité (RLS) : qui peut lire / écrire quoi ----------
alter table public.profiles enable row level security;
alter table public.personnages enable row level security;
alter table public.raids enable row level security;
alter table public.inscriptions enable row level security;

revoke all on public.profiles, public.personnages, public.raids, public.inscriptions from anon;

-- Profils : chacun voit le sien ; les membres voient les membres ; les officiers voient tout et valident les comptes
drop policy if exists profils_lecture on public.profiles;
create policy profils_lecture on public.profiles for select to authenticated
  using (id = auth.uid() or public.est_officier() or (public.est_membre() and role in ('membre','officier')));
drop policy if exists profils_maj_officier on public.profiles;
create policy profils_maj_officier on public.profiles for update to authenticated
  using (public.est_officier()) with check (public.est_officier());

-- Personnages : chacun gère les siens ; les membres voient ceux des autres
drop policy if exists persos_lecture on public.personnages;
create policy persos_lecture on public.personnages for select to authenticated
  using (user_id = auth.uid() or public.est_membre());
drop policy if exists persos_ajout on public.personnages;
create policy persos_ajout on public.personnages for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists persos_maj on public.personnages;
create policy persos_maj on public.personnages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists persos_suppr on public.personnages;
create policy persos_suppr on public.personnages for delete to authenticated
  using (user_id = auth.uid() or public.est_officier());

-- Raids : visibles par les membres validés, gérés par les officiers
drop policy if exists raids_lecture on public.raids;
create policy raids_lecture on public.raids for select to authenticated
  using (public.est_membre());
drop policy if exists raids_ecriture on public.raids;
create policy raids_ecriture on public.raids for all to authenticated
  using (public.est_officier()) with check (public.est_officier());

-- Inscriptions : visibles par les membres ; un membre inscrit uniquement SES personnages, sur un raid non annulé
drop policy if exists inscr_lecture on public.inscriptions;
create policy inscr_lecture on public.inscriptions for select to authenticated
  using (public.est_membre());
drop policy if exists inscr_ajout on public.inscriptions;
create policy inscr_ajout on public.inscriptions for insert to authenticated
  with check (
    user_id = auth.uid() and public.est_membre()
    and exists (select 1 from public.personnages p where p.id = personnage_id and p.user_id = auth.uid())
    and exists (select 1 from public.raids r where r.id = raid_id and r.statut <> 'annule' and not r.archive)
  );
drop policy if exists inscr_maj on public.inscriptions;
create policy inscr_maj on public.inscriptions for update to authenticated
  using (user_id = auth.uid() or public.est_officier())
  with check (user_id = auth.uid() or public.est_officier());
drop policy if exists inscr_suppr on public.inscriptions;
create policy inscr_suppr on public.inscriptions for delete to authenticated
  using (user_id = auth.uid() or public.est_officier());

-- ---------- Mise à jour en direct de la page (temps réel) ----------
do $$ begin alter publication supabase_realtime add table public.raids; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.inscriptions; exception when others then null; end $$;

-- =====================================================================
--  ÉTAPE FINALE : devenir officier
--  1) Créez votre compte sur le site (bouton « Connexion / S'inscrire »).
--  2) Remplacez l'adresse ci-dessous par la vôtre, retirez les deux « -- » au début de
--     la ligne, puis relancez uniquement cette ligne :
--
-- update public.profiles set role = 'officier'
--   where id = (select id from auth.users where email = 'VOTRE@EMAIL.COM');
-- =====================================================================
