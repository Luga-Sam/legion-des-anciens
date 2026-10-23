// POST /api/auth/mot-de-passe  { ancien, nouveau } : change son propre mot de passe
import { reponse, erreur, lireJson, basePrete, origineOk, exigerConnecte, limiter, verifierMdp, hacherMdp, mdpValide, creerSession, cookieSession } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { membre, echec } = await exigerConnecte(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  if (!d || typeof d.ancien !== "string") return erreur("Requête invalide.");
  if (!mdpValide(d.nouveau)) return erreur("Le nouveau mot de passe doit contenir entre 10 et 128 caractères.");
  if (!(await limiter(env, "mdp:" + membre.id, 8, 900))) return erreur("Trop de tentatives. Patientez quelques minutes.", 429);

  const m = await env.DB.prepare("SELECT * FROM membres WHERE id = ?").bind(membre.id).first();
  if (!(await verifierMdp(d.ancien.slice(0, 128), m))) return erreur("Le mot de passe actuel est incorrect.", 401);

  const h = await hacherMdp(d.nouveau, env);
  await env.DB.batch([
    env.DB.prepare("UPDATE membres SET mdp_hash = ?, mdp_sel = ?, mdp_iter = ?, mdp_temporaire = 0 WHERE id = ?").bind(h.mdp_hash, h.mdp_sel, h.mdp_iter, membre.id),
    env.DB.prepare("DELETE FROM sessions WHERE membre_id = ?").bind(membre.id)    // les autres appareils sont déconnectés
  ]);
  const jeton = await creerSession(env, membre.id);
  return reponse({ ok: true }, 200, { "set-cookie": cookieSession(jeton, request) });
}
