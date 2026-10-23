// POST /api/auth/inscription  { email, pseudo, mdp }  : crée un compte « en attente de validation »
import { reponse, erreur, texte, lireJson, basePrete, origineOk, ipClient, limiter, hacherMdp, mdpValide, creerSession, cookieSession, profilPublic } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  const email = texte(d.email, 120).toLowerCase(), pseudo = texte(d.pseudo, 24);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erreur("Adresse e-mail invalide.");
  if (pseudo.length < 2) return erreur("Le pseudo doit contenir au moins 2 caractères.");
  if (!mdpValide(d.mdp)) return erreur("Le mot de passe doit contenir entre 10 et 128 caractères.");
  if (!(await limiter(env, "ins:" + ipClient(request), 10, 3600))) return erreur("Trop de créations de compte. Réessayez plus tard.", 429);

  if (await env.DB.prepare("SELECT id FROM membres WHERE email = ?").bind(email).first()) return erreur("Cette adresse e-mail est déjà utilisée.", 409);

  const h = await hacherMdp(d.mdp, env);
  const r = await env.DB.prepare("INSERT INTO membres (email, pseudo, mdp_hash, mdp_sel, mdp_iter) VALUES (?, ?, ?, ?, ?)")
    .bind(email, pseudo, h.mdp_hash, h.mdp_sel, h.mdp_iter).run();
  const membreId = r.meta.last_row_id;
  const jeton = await creerSession(env, membreId);
  return reponse({ ok: true, membre: profilPublic({ id: membreId, pseudo, role: "en_attente", mdp_temporaire: 0 }) }, 200, { "set-cookie": cookieSession(jeton, request) });
}
