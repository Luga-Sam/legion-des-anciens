// /api/membres : gestion des comptes (réservé aux officiers)
//   GET  -> tous les comptes
//   POST { action: "role" { membreId, role } | "verifier" { membreId } | "reinitialiser" { membreId } | "supprimer" { membreId } }
import { reponse, erreur, id, lireJson, basePrete, origineOk, exigerOfficier, hacherMdp, mdpTemporaire } from "../_lib/outils.js";

const ROLES_COMPTE = ["en_attente", "membre", "officier", "refuse"];

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const { echec } = await exigerOfficier(request, env);
  if (echec) return echec;
  const { results } = await env.DB.prepare("SELECT id, email, pseudo, role, email_verifie, cree_le FROM membres ORDER BY cree_le DESC, id DESC").all();
  return reponse({ membres: results.map(m => ({ ...m, id: String(m.id), email_verifie: !!m.email_verifie })) });
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerOfficier(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");
  const cible = id(d.membreId);
  const existe = await env.DB.prepare("SELECT id, pseudo, role FROM membres WHERE id = ?").bind(cible).first();
  if (!existe) return erreur("Compte introuvable.", 404);

  // On ne peut pas retirer ou supprimer le dernier officier
  const dernierOfficier = async () => {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM membres WHERE role = 'officier' AND id <> ?").bind(cible).first();
    return existe.role === "officier" && n === 0;
  };

  if (d.action === "role") {
    if (!ROLES_COMPTE.includes(d.role)) return erreur("Rôle invalide.");
    if (d.role !== "officier" && await dernierOfficier()) return erreur("Il doit rester au moins un officier.", 409);
    await env.DB.prepare("UPDATE membres SET role = ? WHERE id = ?").bind(d.role, cible).run();
    return reponse({ ok: true });
  }
  if (d.action === "verifier") {
    // Secours : confirme à la main une adresse (par exemple si l'e-mail n'arrive jamais)
    await env.DB.batch([
      env.DB.prepare("UPDATE membres SET email_verifie = 1, role = CASE WHEN role = 'en_attente' THEN 'membre' ELSE role END WHERE id = ?").bind(cible),
      env.DB.prepare("DELETE FROM verifications WHERE membre_id = ?").bind(cible)
    ]);
    return reponse({ ok: true });
  }
  if (d.action === "reinitialiser") {
    const mdp = mdpTemporaire();
    const h = await hacherMdp(mdp, env);
    await env.DB.batch([
      env.DB.prepare("UPDATE membres SET mdp_hash = ?, mdp_sel = ?, mdp_iter = ?, mdp_temporaire = 1 WHERE id = ?").bind(h.mdp_hash, h.mdp_sel, h.mdp_iter, cible),
      env.DB.prepare("DELETE FROM sessions WHERE membre_id = ?").bind(cible)
    ]);
    return reponse({ ok: true, pseudo: existe.pseudo, motDePasse: mdp });
  }
  if (d.action === "supprimer") {
    if (cible === membre.id) return erreur("Vous ne pouvez pas supprimer votre propre compte.", 409);
    if (await dernierOfficier()) return erreur("Il doit rester au moins un officier.", 409);
    await env.DB.prepare("DELETE FROM membres WHERE id = ?").bind(cible).run();
    return reponse({ ok: true });
  }
  return erreur("Action inconnue.");
}
