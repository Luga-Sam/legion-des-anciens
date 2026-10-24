// POST /api/auth/renvoyer  { email, mdp } : renvoie l'e-mail de confirmation (le mot de passe évite d'envoyer des e-mails à n'importe qui)
import { reponse, erreur, texte, lireJson, basePrete, origineOk, ipClient, limiter, verifierMdp, emailPret, creerVerification, envoyerEmailVerification } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");
  const email = texte(d.email, 120).toLowerCase(), mdp = typeof d.mdp === "string" ? d.mdp.slice(0, 128) : "";
  if (!email || !mdp) return erreur("Saisissez votre e-mail et votre mot de passe.");
  if (!emailPret(env)) return erreur("L'envoi d'e-mails n'est pas encore configuré sur ce site. Contactez un officier sur notre Discord.", 503);
  if (!(await limiter(env, "renip:" + ipClient(request), 10, 3600))) return erreur("Trop de demandes. Réessayez plus tard.", 429);

  const m = await env.DB.prepare("SELECT * FROM membres WHERE email = ?").bind(email).first();
  if (!m || !(await verifierMdp(mdp, m))) return erreur("E-mail ou mot de passe incorrect.", 401);
  if (m.email_verifie) return erreur("Cette adresse est déjà confirmée : vous pouvez vous connecter.", 409);
  if (!(await limiter(env, "mail:" + email, 3, 3600))) return erreur("Un e-mail vient déjà d'être envoyé. Patientez un peu (3 envois maximum par heure).", 429);

  const jeton = await creerVerification(env, m.id);
  const emailEnvoye = await envoyerEmailVerification(env, request, { pseudo: m.pseudo, email }, jeton);
  return reponse({ ok: true, emailEnvoye });
}
