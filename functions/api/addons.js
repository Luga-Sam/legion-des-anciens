// /api/addons : les addons recommandés par la guilde
//   GET   -> lecture ouverte à tous les visiteurs ; "peutGerer" vaut true pour un officier connecté
//   POST { action } -> réservé aux officiers : "creer" { addon } | "modifier" { id, addon } | "supprimer" { id }
//   où addon = { nom, categorie, niveau, description, lien }
import { reponse, erreur, texte, id, lireJson, basePrete, origineOk, exigerOfficier, membreCourant } from "../_lib/outils.js";

const NIVEAUX = ["obligatoire", "recommande", "confort"];
const URL_HTTPS = /^https:\/\/[^\s"'<>\\]{4,480}$/;
const MAX_ADDONS = 200;

function valider(x) {
  if (!x || typeof x !== "object") return { erreur: "Requête invalide." };
  const a = {
    nom: texte(x.nom, 60), categorie: texte(x.categorie, 40), niveau: texte(x.niveau, 20) || "recommande",
    description: texte(x.description, 600), lien: texte(x.lien, 500)
  };
  if (a.nom.length < 2) return { erreur: "Le nom de l'addon doit contenir au moins 2 caractères." };
  if (a.categorie.length < 2) return { erreur: "Choisissez ou saisissez une catégorie." };
  if (!NIVEAUX.includes(a.niveau)) return { erreur: "Importance invalide." };
  if (a.description.length < 5) return { erreur: "Ajoutez une description pour expliquer l'utilité de l'addon." };
  if (!URL_HTTPS.test(a.lien)) return { erreur: "Le lien de téléchargement doit commencer par https://" };
  return { a };
}

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const membre = await membreCourant(request, env);   // facultatif : la liste est ouverte à tous
  const { results } = await env.DB.prepare(
    `SELECT id, nom, categorie, niveau, description, lien FROM addons
     ORDER BY categorie COLLATE NOCASE,
       CASE niveau WHEN 'obligatoire' THEN 0 WHEN 'recommande' THEN 1 ELSE 2 END, nom COLLATE NOCASE
     LIMIT 300`
  ).all();
  return reponse({ peutGerer: !!membre && membre.role === "officier", addons: results.map(a => ({ ...a, id: String(a.id) })) });
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerOfficier(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  if (d.action === "creer") {
    const v = valider(d.addon); if (v.erreur) return erreur(v.erreur);
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM addons").first();
    if (n >= MAX_ADDONS) return erreur("Trop d'addons enregistrés : supprimez les plus anciens.", 409);
    const a = v.a;
    const r = await env.DB.prepare("INSERT INTO addons (nom, categorie, niveau, description, lien, cree_par) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(a.nom, a.categorie, a.niveau, a.description, a.lien, membre.id).run();
    return reponse({ ok: true, id: String(r.meta.last_row_id) });
  }
  if (d.action === "modifier") {
    const v = valider(d.addon); if (v.erreur) return erreur(v.erreur);
    const a = v.a;
    const r = await env.DB.prepare("UPDATE addons SET nom = ?, categorie = ?, niveau = ?, description = ?, lien = ?, maj_le = unixepoch() WHERE id = ?")
      .bind(a.nom, a.categorie, a.niveau, a.description, a.lien, id(d.id)).run();
    return r.meta.changes ? reponse({ ok: true }) : erreur("Addon introuvable.", 404);
  }
  if (d.action === "supprimer") {
    const r = await env.DB.prepare("DELETE FROM addons WHERE id = ?").bind(id(d.id)).run();
    return r.meta.changes ? reponse({ ok: true }) : erreur("Addon introuvable.", 404);
  }
  return erreur("Action inconnue.");
}
