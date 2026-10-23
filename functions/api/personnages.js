// /api/personnages : fiches personnages (Armurerie) du membre connecté
//   GET  -> mes personnages
//   POST { action: "creer" | "modifier" | "supprimer", ... }
import { reponse, erreur, texte, entier, id, lireJson, basePrete, origineOk, exigerConnecte, CLASSES, ROLES } from "../_lib/outils.js";

const colonnes = "id, nom, classe, specialisation, role, niveau, metier1, metier2";
const publique = p => ({ ...p, id: String(p.id) });

function valider(d) {
  const p = {
    nom: texte(d.nom, 24), classe: texte(d.classe, 30), specialisation: texte(d.specialisation, 40), role: d.role,
    niveau: entier(d.niveau, 1, 90, 1), metier1: texte(d.metier1, 30) || null, metier2: texte(d.metier2, 30) || null
  };
  if (p.nom.length < 2) return { erreur: "Le nom du personnage doit contenir au moins 2 caractères." };
  if (!CLASSES.includes(p.classe)) return { erreur: "Classe inconnue." };
  if (p.specialisation.length < 2) return { erreur: "Choisissez une spécialisation." };
  if (!ROLES.includes(p.role)) return { erreur: "Rôle invalide." };
  return { p };
}

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const { membre, echec } = await exigerConnecte(request, env);
  if (echec) return echec;
  const { results } = await env.DB.prepare(`SELECT ${colonnes} FROM personnages WHERE membre_id = ? ORDER BY id`).bind(membre.id).all();
  return reponse({ personnages: results.map(publique) });
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerConnecte(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  if (d.action === "creer") {
    const v = valider(d); if (v.erreur) return erreur(v.erreur);
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM personnages WHERE membre_id = ?").bind(membre.id).first();
    if (n >= 20) return erreur("Vous avez atteint le nombre maximal de personnages (20).", 409);
    const p = v.p;
    await env.DB.prepare("INSERT INTO personnages (membre_id, nom, classe, specialisation, role, niveau, metier1, metier2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(membre.id, p.nom, p.classe, p.specialisation, p.role, p.niveau, p.metier1, p.metier2).run();
    return reponse({ ok: true });
  }
  if (d.action === "modifier") {
    const v = valider(d); if (v.erreur) return erreur(v.erreur);
    const p = v.p;
    const r = await env.DB.prepare("UPDATE personnages SET nom = ?, classe = ?, specialisation = ?, role = ?, niveau = ?, metier1 = ?, metier2 = ? WHERE id = ? AND membre_id = ?")
      .bind(p.nom, p.classe, p.specialisation, p.role, p.niveau, p.metier1, p.metier2, id(d.id), membre.id).run();
    return r.meta.changes ? reponse({ ok: true }) : erreur("Personnage introuvable.", 404);
  }
  if (d.action === "supprimer") {
    const r = await env.DB.prepare("DELETE FROM personnages WHERE id = ? AND membre_id = ?").bind(id(d.id), membre.id).run();
    return r.meta.changes ? reponse({ ok: true }) : erreur("Personnage introuvable.", 404);
  }
  return erreur("Action inconnue.");
}
