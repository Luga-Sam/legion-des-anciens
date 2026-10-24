// POST /api/auth/verifier  { token } : appelé par la page /verify quand on clique sur le lien reçu par e-mail
import { reponse, erreur, texte, lireJson, basePrete, origineOk, ipClient, limiter, sha256Hex, maintenant } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  if (!(await limiter(env, "ver:" + ipClient(request), 30, 900))) return erreur("Trop de tentatives. Réessayez dans quelques minutes.", 429);
  const d = await lireJson(request);
  const jeton = texte(d?.token, 100);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(jeton)) return erreur("Ce lien est incomplet. Ouvrez-le depuis le message reçu par e-mail.");

  const v = await env.DB.prepare("SELECT membre_id, expire_le FROM verifications WHERE token_hash = ?").bind(await sha256Hex(jeton)).first();
  if (!v || v.expire_le < maintenant()) {
    return erreur("Ce lien est invalide ou a expiré. Si vous avez déjà confirmé votre adresse, connectez-vous directement ; sinon, connectez-vous pour recevoir un nouvel e-mail.", 410);
  }
  // L'adresse est confirmée : le compte devient membre (sauf s'il a été refusé par un officier)
  await env.DB.batch([
    env.DB.prepare("UPDATE membres SET email_verifie = 1, role = CASE WHEN role = 'en_attente' THEN 'membre' ELSE role END WHERE id = ?").bind(v.membre_id),
    env.DB.prepare("DELETE FROM verifications WHERE membre_id = ?").bind(v.membre_id)
  ]);
  return reponse({ ok: true });
}
