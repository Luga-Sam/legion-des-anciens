// /api/raids : calendrier de raid (réservé aux membres validés)
//   GET            -> raids à venir (non archivés) avec leurs inscrits
//   GET ?tout=1    -> (officiers) tous les raids, archivés compris
//   POST { action } :
//     membres : "inscrire" { raidId, persoId, role, presence, heure, note }  |  "retirer" { inscriptionId }
//     officiers : "creer" { raid }  |  "statut"  |  "archiver"  |  "supprimer"  |  "etat" { inscriptionId, etat }
import { reponse, erreur, texte, entier, heure, jour, id, lireJson, basePrete, origineOk, exigerMembre, ROLES } from "../_lib/outils.js";

const STATUTS = ["ouvert", "complet", "annule"];
const PRESENCES = ["present", "retard", "absent"];
const ETATS = ["attente", "confirme", "remplacant"];

function assembler(raids, lignes) {
  const parRaid = new Map(raids.map(r => [r.id, {
    id: String(r.id), titre: r.titre, date: r.date_raid, rassemblement: r.rassemblement, debut: r.debut, description: r.description,
    compo: { tank: r.tank, soigneur: r.soigneur, dps: r.dps }, statut: r.statut, archive: !!r.archive, inscriptions: []
  }]));
  for (const l of lignes) {
    parRaid.get(l.raid_id)?.inscriptions.push({
      id: String(l.id), membreId: String(l.membre_id), persoId: String(l.personnage_id),
      pseudo: l.nom, classe: l.classe, spe: l.specialisation, niveau: l.niveau, metier1: l.metier1, metier2: l.metier2,
      persoRole: l.role_perso, role: l.role_raid, presence: l.presence, heure: l.heure || "", note: l.note, etat: l.etat, joueur: l.joueur
    });
  }
  return [...parRaid.values()];
}

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const { membre, echec } = await exigerMembre(request, env);
  if (echec) return echec;
  const tout = new URL(request.url).searchParams.get("tout") === "1";
  if (tout && membre.role !== "officier") return erreur("Réservé aux officiers.", 403);

  const filtre = tout ? "" : "WHERE archive = 0";
  const { results: raids } = await env.DB.prepare(`SELECT * FROM raids ${filtre} ORDER BY date_raid, debut`).all();
  const { results: lignes } = await env.DB.prepare(
    `SELECT i.id, i.raid_id, i.personnage_id, i.membre_id, i.role AS role_raid, i.presence, i.heure, i.note, i.etat,
            p.nom, p.classe, p.specialisation, p.role AS role_perso, p.niveau, p.metier1, p.metier2, m.pseudo AS joueur
     FROM inscriptions i JOIN personnages p ON p.id = i.personnage_id JOIN membres m ON m.id = i.membre_id
     WHERE i.raid_id IN (SELECT id FROM raids ${filtre}) ORDER BY i.id`
  ).all();
  return reponse({ raids: assembler(raids, lignes) });
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerMembre(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");
  const officier = membre.role === "officier";

  /* ----- Actions des membres ----- */
  if (d.action === "inscrire") {
    const raid = await env.DB.prepare("SELECT id, statut, archive FROM raids WHERE id = ?").bind(id(d.raidId)).first();
    if (!raid || raid.archive) return erreur("Ce raid n'existe plus.", 404);
    if (raid.statut === "annule") return erreur("Ce raid est annulé.", 409);
    const perso = await env.DB.prepare("SELECT id FROM personnages WHERE id = ? AND membre_id = ?").bind(id(d.persoId), membre.id).first();
    if (!perso) return erreur("Choisissez un de vos personnages.");
    if (!ROLES.includes(d.role) || !PRESENCES.includes(d.presence)) return erreur("Rôle ou présence invalide.");
    const h = d.presence === "retard" ? heure(d.heure) : "";
    await env.DB.prepare(
      `INSERT INTO inscriptions (raid_id, personnage_id, membre_id, role, presence, heure, note) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(raid_id, personnage_id) DO UPDATE SET role = excluded.role, presence = excluded.presence, heure = excluded.heure, note = excluded.note`
    ).bind(raid.id, perso.id, membre.id, d.role, d.presence, h || null, texte(d.note, 120)).run();
    return reponse({ ok: true });
  }
  if (d.action === "retirer") {
    const r = officier
      ? await env.DB.prepare("DELETE FROM inscriptions WHERE id = ?").bind(id(d.inscriptionId)).run()
      : await env.DB.prepare("DELETE FROM inscriptions WHERE id = ? AND membre_id = ?").bind(id(d.inscriptionId), membre.id).run();
    return r.meta.changes ? reponse({ ok: true }) : erreur("Inscription introuvable.", 404);
  }

  /* ----- Actions réservées aux officiers ----- */
  if (!officier) return erreur("Réservé aux officiers.", 403);
  switch (d.action) {
    case "creer": {
      const x = d.raid || {};
      const titre = texte(x.titre, 60), date = jour(x.date), rass = heure(x.rassemblement), debut = heure(x.debut);
      if (titre.length < 2 || !date || !rass || !debut) return erreur("Titre, date et heures sont obligatoires.");
      const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM raids").first();
      if (n >= 60) return erreur("Trop de raids enregistrés : supprimez les anciens.", 409);
      await env.DB.prepare("INSERT INTO raids (titre, date_raid, rassemblement, debut, description, tank, soigneur, dps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(titre, date, rass, debut, texte(x.description, 300), entier(x.tank, 0, 40), entier(x.soigneur, 0, 40), entier(x.dps, 0, 40)).run();
      return reponse({ ok: true });
    }
    case "statut": {
      if (!STATUTS.includes(d.statut)) return erreur("Statut invalide.");
      const r = await env.DB.prepare("UPDATE raids SET statut = ? WHERE id = ?").bind(d.statut, id(d.raidId)).run();
      return r.meta.changes ? reponse({ ok: true }) : erreur("Raid introuvable.", 404);
    }
    case "archiver": {
      const r = await env.DB.prepare("UPDATE raids SET archive = ? WHERE id = ?").bind(d.archive ? 1 : 0, id(d.raidId)).run();
      return r.meta.changes ? reponse({ ok: true }) : erreur("Raid introuvable.", 404);
    }
    case "supprimer": {
      const r = await env.DB.prepare("DELETE FROM raids WHERE id = ?").bind(id(d.raidId)).run();
      return r.meta.changes ? reponse({ ok: true }) : erreur("Raid introuvable.", 404);
    }
    case "etat": {
      if (!ETATS.includes(d.etat)) return erreur("État invalide.");
      const r = await env.DB.prepare("UPDATE inscriptions SET etat = ? WHERE id = ?").bind(d.etat, id(d.inscriptionId)).run();
      return r.meta.changes ? reponse({ ok: true }) : erreur("Inscription introuvable.", 404);
    }
  }
  return erreur("Action inconnue.");
}
