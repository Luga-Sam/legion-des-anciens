// /api/chroniques : « Les Chroniques des Anciens », le blog de la guilde
//   GET            -> public : liste des chroniques publiées (la chroniqueuse y voit aussi ses brouillons)
//   GET ?id=12     -> public : une chronique en entier, avec ses commentaires
//   POST { action } :
//     membres validés : "commenter" { chroniqueId, contenu }  |  "supprimer_commentaire" { commentaireId }
//     chroniqueuse et officiers : "creer" { chronique }  |  "modifier" { id, chronique }  |  "supprimer" { id }
//   où chronique = { titre, extrait, contenu, image, publie }
import { reponse, erreur, texte, id, lireJson, basePrete, origineOk, exigerMembre, membreCourant, peutRediger, limiter, maintenant } from "../_lib/outils.js";

const URL_HTTPS = /^https:\/\/[^\s"'<>\\]{4,480}$/;
const MAX_CHRONIQUES = 300;

const estOfficier = m => !!m && m.role === "officier";
// Une chronique se modifie par son autrice ; les officiers peuvent intervenir sur toutes
const peutModifier = (m, c) => peutRediger(m) && (estOfficier(m) || c.auteur_id === m.id);

// Petit résumé pour la liste, quand la chroniqueuse n'a pas écrit d'extrait
function apercu(c) {
  if (c.extrait) return c.extrait;
  const t = String(c.debut || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/^(>|##|-)\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 220 ? t.slice(0, 220).replace(/\s+\S*$/, "") + "…" : t;
}

function valider(x) {
  if (!x || typeof x !== "object") return { erreur: "Requête invalide." };
  const titre = texte(x.titre, 120);
  const contenu = typeof x.contenu === "string" ? x.contenu.replace(/\r\n?/g, "\n").trim().slice(0, 12000) : "";
  const image = texte(x.image, 500);
  if (titre.length < 3) return { erreur: "Le titre doit contenir au moins 3 caractères." };
  if (contenu.length < 20) return { erreur: "Le texte de la chronique est trop court (20 caractères minimum)." };
  if (image && !URL_HTTPS.test(image)) return { erreur: "L'adresse de l'image doit commencer par https://" };
  return { c: { titre, extrait: texte(x.extrait, 300), contenu, image, publie: x.publie ? 1 : 0 } };
}

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const membre = await membreCourant(request, env);   // facultatif : les visiteurs peuvent lire
  const demande = id(new URL(request.url).searchParams.get("id"));

  if (demande) {
    const c = await env.DB.prepare("SELECT * FROM chroniques WHERE id = ?").bind(demande).first();
    if (!c || (!c.publie && !peutModifier(membre, c))) return erreur("Cette chronique n'existe pas ou n'est plus disponible.", 404);
    const { results } = await env.DB.prepare(
      `SELECT k.id, k.membre_id, k.contenu, k.cree_le, m.pseudo, m.role, m.grade
       FROM chronique_commentaires k JOIN membres m ON m.id = k.membre_id
       WHERE k.chronique_id = ? ORDER BY k.id`
    ).bind(c.id).all();
    return reponse({
      chronique: {
        id: String(c.id), titre: c.titre, extrait: c.extrait, contenu: c.contenu, image: c.image,
        auteur: c.auteur_pseudo, date: c.publie_le || c.cree_le, publie: !!c.publie, modifiable: peutModifier(membre, c)
      },
      commentaires: results.map(k => ({
        id: String(k.id), auteur: k.pseudo, officier: k.role === "officier", chroniqueuse: k.grade === "chroniqueuse",
        date: k.cree_le, contenu: k.contenu,
        supprimable: !!membre && (k.membre_id === membre.id || estOfficier(membre) || (membre.grade === "chroniqueuse" && c.auteur_id === membre.id))
      }))
    });
  }

  // Liste : tout le monde voit les chroniques publiées ; la chroniqueuse y ajoute ses brouillons, les officiers tous les brouillons
  let filtre = "WHERE c.publie = 1", liaison = [];
  if (estOfficier(membre)) filtre = "";
  else if (peutRediger(membre)) { filtre = "WHERE c.publie = 1 OR c.auteur_id = ?"; liaison = [membre.id]; }
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.titre, c.extrait, substr(c.contenu, 1, 700) AS debut, c.image, c.auteur_pseudo, c.publie,
            COALESCE(c.publie_le, c.cree_le) AS date_c,
            (SELECT COUNT(*) FROM chronique_commentaires k WHERE k.chronique_id = c.id) AS nb_com
     FROM chroniques c ${filtre} ORDER BY date_c DESC, c.id DESC LIMIT 60`
  ).bind(...liaison).all();
  return reponse({
    peutRediger: peutRediger(membre),
    chroniques: results.map(c => ({
      id: String(c.id), titre: c.titre, apercu: apercu(c), image: c.image, auteur: c.auteur_pseudo,
      date: c.date_c, publie: !!c.publie, nbCom: c.nb_com
    }))
  });
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerMembre(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  /* ----- Actions de tous les membres validés : commentaires ----- */
  if (d.action === "commenter") {
    const c = await env.DB.prepare("SELECT id, publie FROM chroniques WHERE id = ?").bind(id(d.chroniqueId)).first();
    if (!c || !c.publie) return erreur("Cette chronique n'existe plus.", 404);
    const contenu = texte(d.contenu, 600);
    if (contenu.length < 2) return erreur("Votre commentaire est trop court.");
    if (!(await limiter(env, "chrocom:" + membre.id, 10, 600))) return erreur("Vous commentez très vite : patientez quelques minutes.", 429);
    await env.DB.prepare("INSERT INTO chronique_commentaires (chronique_id, membre_id, contenu) VALUES (?, ?, ?)").bind(c.id, membre.id, contenu).run();
    return reponse({ ok: true });
  }
  if (d.action === "supprimer_commentaire") {
    const k = await env.DB.prepare(
      "SELECT k.id, k.membre_id, c.auteur_id FROM chronique_commentaires k JOIN chroniques c ON c.id = k.chronique_id WHERE k.id = ?"
    ).bind(id(d.commentaireId)).first();
    if (!k) return erreur("Commentaire introuvable.", 404);
    const droit = k.membre_id === membre.id || estOfficier(membre) || (membre.grade === "chroniqueuse" && k.auteur_id === membre.id);
    if (!droit) return erreur("Vous ne pouvez pas supprimer ce commentaire.", 403);
    await env.DB.prepare("DELETE FROM chronique_commentaires WHERE id = ?").bind(k.id).run();
    return reponse({ ok: true });
  }

  /* ----- Actions réservées à la chroniqueuse et aux officiers ----- */
  if (!peutRediger(membre)) return erreur("Réservé à la chroniqueuse et aux officiers.", 403);

  if (d.action === "creer") {
    const v = valider(d.chronique); if (v.erreur) return erreur(v.erreur);
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM chroniques").first();
    if (n >= MAX_CHRONIQUES) return erreur("Trop de chroniques enregistrées : supprimez les plus anciennes.", 409);
    const c = v.c, t = maintenant();
    const r = await env.DB.prepare(
      "INSERT INTO chroniques (titre, extrait, contenu, image, auteur_id, auteur_pseudo, publie, publie_le, cree_le, maj_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(c.titre, c.extrait, c.contenu, c.image, membre.id, membre.pseudo, c.publie, c.publie ? t : null, t, t).run();
    return reponse({ ok: true, id: String(r.meta.last_row_id) });
  }

  if (d.action !== "modifier" && d.action !== "supprimer") return erreur("Action inconnue.");
  const cible = await env.DB.prepare("SELECT id, auteur_id FROM chroniques WHERE id = ?").bind(id(d.id)).first();
  if (!cible) return erreur("Chronique introuvable.", 404);
  if (!peutModifier(membre, cible)) return erreur("Cette chronique appartient à une autre rédactrice.", 403);

  if (d.action === "modifier") {
    const v = valider(d.chronique); if (v.erreur) return erreur(v.erreur);
    const c = v.c, t = maintenant();
    // La date de publication est celle de la première mise en ligne ; elle ne bouge plus ensuite
    await env.DB.prepare(
      `UPDATE chroniques SET titre = ?, extrait = ?, contenu = ?, image = ?, publie = ?,
         publie_le = CASE WHEN ? = 1 AND publie_le IS NULL THEN ? ELSE publie_le END, maj_le = ? WHERE id = ?`
    ).bind(c.titre, c.extrait, c.contenu, c.image, c.publie, c.publie, t, t, cible.id).run();
    return reponse({ ok: true, id: String(cible.id) });
  }
  if (d.action === "supprimer") {
    await env.DB.prepare("DELETE FROM chroniques WHERE id = ?").bind(cible.id).run();
    return reponse({ ok: true });
  }
  return erreur("Action inconnue.");
}
