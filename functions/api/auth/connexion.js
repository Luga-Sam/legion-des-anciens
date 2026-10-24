// POST /api/auth/connexion  { email, mdp }
import { reponse, erreur, texte, lireJson, basePrete, origineOk, ipClient, limiter, oublierLimite, verifierMdp, creerSession, cookieSession, profilPublic } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const d = await lireJson(request);
  if (!d) return erreur("Requête invalide.");

  const email = texte(d.email, 120).toLowerCase(), mdp = typeof d.mdp === "string" ? d.mdp.slice(0, 128) : "";
  if (!email || !mdp) return erreur("Saisissez votre e-mail et votre mot de passe.");
  const cleEmail = "login:" + email;
  if (!(await limiter(env, "loginip:" + ipClient(request), 40, 900)) || !(await limiter(env, cleEmail, 8, 900)))
    return erreur("Trop de tentatives. Patientez quelques minutes avant de réessayer.", 429);

  const m = await env.DB.prepare("SELECT * FROM membres WHERE email = ?").bind(email).first();
  if (!m || !(await verifierMdp(mdp, m))) return erreur("E-mail ou mot de passe incorrect.", 401);

  if (!m.email_verifie) {
    return reponse({ erreur: "Votre adresse e-mail n'est pas encore confirmée. Ouvrez le message que nous vous avons envoyé (pensez aux courriers indésirables) ou demandez un nouvel e-mail.", emailNonVerifie: true }, 403);
  }
  await oublierLimite(env, cleEmail);
  const jeton = await creerSession(env, m.id);
  return reponse({ ok: true, membre: profilPublic(m) }, 200, { "set-cookie": cookieSession(jeton, request) });
}
