// POST /api/auth/inscription  { email, pseudo, mdp }
// Crée un compte NON confirmé et envoie un e-mail contenant le lien de confirmation.
// Aucune session n'est ouverte : il faut d'abord cliquer sur le lien reçu par e-mail.
import { reponse, erreur, texte, lireJson, basePrete, origineOk, ipClient, limiter, hacherMdp, mdpValide, emailPret, creerVerification, envoyerEmailVerification } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  const email = texte(d.email, 120).toLowerCase(), pseudo = texte(d.pseudo, 24);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erreur("Adresse e-mail invalide.");
  if (pseudo.length < 2) return erreur("Le pseudo doit contenir au moins 2 caractères.");
  if (!mdpValide(d.mdp)) return erreur("Le mot de passe doit contenir entre 10 et 128 caractères.");
  if (!emailPret(env)) return erreur("L'envoi d'e-mails n'est pas encore configuré sur ce site : les inscriptions sont momentanément fermées. Contactez un officier sur notre Discord.", 503);
  if (!(await limiter(env, "ins:" + ipClient(request), 10, 3600))) return erreur("Trop de créations de compte. Réessayez plus tard.", 429);

  const existant = await env.DB.prepare("SELECT id, email_verifie FROM membres WHERE email = ?").bind(email).first();
  if (existant && existant.email_verifie) return erreur("Cette adresse e-mail est déjà utilisée. Connectez-vous, ou demandez à un officier un mot de passe temporaire.", 409);
  if (!(await limiter(env, "mail:" + email, 3, 3600))) return erreur("Un e-mail de confirmation a déjà été envoyé à cette adresse. Patientez un peu avant de recommencer.", 429);

  const h = await hacherMdp(d.mdp, env);
  let membreId;
  if (existant) {
    // Compte jamais confirmé : on le remplace, pour qu'on ne puisse pas « squatter » l'adresse d'un autre
    await env.DB.prepare("UPDATE membres SET pseudo = ?, mdp_hash = ?, mdp_sel = ?, mdp_iter = ?, mdp_temporaire = 0 WHERE id = ?")
      .bind(pseudo, h.mdp_hash, h.mdp_sel, h.mdp_iter, existant.id).run();
    membreId = existant.id;
  } else {
    const r = await env.DB.prepare("INSERT INTO membres (email, pseudo, mdp_hash, mdp_sel, mdp_iter) VALUES (?, ?, ?, ?, ?)")
      .bind(email, pseudo, h.mdp_hash, h.mdp_sel, h.mdp_iter).run();
    membreId = r.meta.last_row_id;
  }
  const jeton = await creerVerification(env, membreId);
  const emailEnvoye = await envoyerEmailVerification(env, request, { pseudo, email }, jeton);
  return reponse({ ok: true, emailEnvoye });
}
