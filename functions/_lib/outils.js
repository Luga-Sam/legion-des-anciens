// Outils partagés par toutes les fonctions de l'API (mots de passe, sessions, protections).
// Ce fichier n'est pas une route : il est simplement utilisé par les autres.

export const CLASSES = ["Guerrier", "Paladin", "Chasseur", "Voleur", "Prêtre", "Chamane", "Mage", "Démoniste", "Druide"];
export const ROLES = ["tank", "soigneur", "dps"];

export const reponse = (corps, statut = 200, entetes = {}) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...entetes }
  });
export const erreur = (message, statut = 400) => reponse({ erreur: message }, statut);
export const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const entier = (v, min, max, defaut = min) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : defaut;
};
export const maintenant = () => Math.floor(Date.now() / 1000);
export const heure = v => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim()) ? v.trim() : "");
export const jour = v => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : "");
export const id = v => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : 0; };

export function basePrete(env) {
  return env.DB ? null : erreur("La base de données D1 n'est pas reliée au projet (voir le guide : wrangler.toml).", 500);
}
export async function lireJson(request) {
  try { return await request.json(); } catch { return null; }
}
// Protection : une requête qui modifie des données doit venir de notre propre site
export function origineOk(request) {
  const o = request.headers.get("Origin");
  if (!o) return true;
  try { return new URL(o).host === new URL(request.url).host; } catch { return false; }
}
export const ipClient = request => request.headers.get("CF-Connecting-IP") || "inconnue";

/* ---------- Encodages ---------- */
const enc = new TextEncoder();
const versB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const versB64Url = buf => versB64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const versHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha256Hex = async t => versHex(await crypto.subtle.digest("SHA-256", enc.encode(t)));

/* ---------- Mots de passe ----------
   PBKDF2-SHA256 avec un sel unique par membre. Cloudflare plafonne à 100 000 itérations :
   c'est le maximum possible. Le nombre d'itérations est stocké avec chaque mot de passe. */
export const ITERATIONS = 100000;
async function deriver(mdp, sel, iterations) {
  const cle = await crypto.subtle.importKey("raw", enc.encode(mdp), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations }, cle, 256);
}
export async function hacherMdp(mdp, env) {
  // Si Cloudflare signale un dépassement de temps sur le plan gratuit, vous pouvez baisser ce nombre
  // avec la variable MDP_ITERATIONS (minimum 20000). Les anciens mots de passe restent valides.
  const iterations = entier(env.MDP_ITERATIONS, 20000, ITERATIONS, ITERATIONS);
  const sel = crypto.getRandomValues(new Uint8Array(16));
  return { mdp_hash: versB64(await deriver(mdp, sel, iterations)), mdp_sel: versB64(sel), mdp_iter: iterations };
}
export async function verifierMdp(mdp, m) {
  const calcule = new Uint8Array(await deriver(mdp, deB64(m.mdp_sel), m.mdp_iter));
  const attendu = deB64(m.mdp_hash);
  let diff = calcule.length ^ attendu.length;
  for (let i = 0; i < calcule.length; i++) diff |= calcule[i] ^ (attendu[i] ?? 0);
  return diff === 0;
}
export const mdpValide = mdp => typeof mdp === "string" && mdp.length >= 10 && mdp.length <= 128;
export function mdpTemporaire() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(14))].map(b => alphabet[b % alphabet.length]).join("");
}

/* ---------- Sessions (cookie sécurisé) ---------- */
const DUREE_SESSION = 30 * 24 * 3600;
const NOM_COOKIE = "legion_session";
export async function creerSession(env, membreId) {
  const jeton = versB64Url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expire_le < ?").bind(maintenant()),
    env.DB.prepare("INSERT INTO sessions (token_hash, membre_id, expire_le) VALUES (?, ?, ?)")
      .bind(await sha256Hex(jeton), membreId, maintenant() + DUREE_SESSION)
  ]);
  return jeton;
}
const securise = request => (new URL(request.url).protocol === "https:" ? "; Secure" : "");
export const cookieSession = (jeton, request) =>
  `${NOM_COOKIE}=${jeton}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DUREE_SESSION}${securise(request)}`;
export const cookieEffacer = request => `${NOM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securise(request)}`;
export function lireCookie(request, nom = NOM_COOKIE) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === nom) return v.join("=");
  }
  return "";
}
export async function detruireSession(request, env) {
  const jeton = lireCookie(request);
  if (jeton) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(jeton)).run();
}
export async function membreCourant(request, env) {
  const jeton = lireCookie(request);
  if (!jeton) return null;
  // Un compte dont l'adresse e-mail n'est pas confirmée n'a aucune session valide
  return env.DB.prepare(
    `SELECT m.id, m.email, m.pseudo, m.role, m.mdp_temporaire FROM sessions s
     JOIN membres m ON m.id = s.membre_id WHERE s.token_hash = ? AND s.expire_le > ? AND m.email_verifie = 1`
  ).bind(await sha256Hex(jeton), maintenant()).first();
}
export const profilPublic = m => ({ id: String(m.id), pseudo: m.pseudo, role: m.role, mdpTemporaire: !!m.mdp_temporaire });

/* ---------- Contrôles d'accès ---------- */
export async function exigerConnecte(request, env) {
  const m = await membreCourant(request, env);
  return m ? { membre: m } : { echec: erreur("Connexion requise.", 401) };
}
export async function exigerMembre(request, env) {
  const { membre, echec } = await exigerConnecte(request, env);
  if (echec) return { echec };
  if (membre.role !== "membre" && membre.role !== "officier") return { echec: erreur("Votre compte n'est pas encore validé par un officier.", 403) };
  return { membre };
}
export async function exigerOfficier(request, env) {
  const { membre, echec } = await exigerConnecte(request, env);
  if (echec) return { echec };
  if (membre.role !== "officier") return { echec: erreur("Réservé aux officiers.", 403) };
  return { membre };
}

/* ---------- Limite d'essais (anti-abus) ---------- */
export async function limiter(env, cle, max, fenetreSecondes) {
  const t = maintenant();
  const ligne = await env.DB.prepare("SELECT nb, debut FROM tentatives WHERE cle = ?").bind(cle).first();
  if (!ligne || t - ligne.debut > fenetreSecondes) {
    await env.DB.prepare("INSERT INTO tentatives (cle, nb, debut) VALUES (?, 1, ?) ON CONFLICT(cle) DO UPDATE SET nb = 1, debut = excluded.debut").bind(cle, t).run();
    return true;
  }
  if (ligne.nb >= max) return false;
  await env.DB.prepare("UPDATE tentatives SET nb = nb + 1 WHERE cle = ?").bind(cle).run();
  return true;
}
export const oublierLimite = (env, cle) => env.DB.prepare("DELETE FROM tentatives WHERE cle = ?").bind(cle).run();

/* ---------- Confirmation de l'adresse e-mail (envoi via Resend) ----------
   Réglages dans Cloudflare (type « Secret ») :
     RESEND_API_KEY     la clé API de votre compte Resend
     EMAIL_EXPEDITEUR   l'expéditeur, ex : La Légion des Anciens <contact@votre-domaine.fr>
                        (le domaine doit être vérifié dans Resend)
     URL_SITE           facultatif : adresse du site, ex : https://legion.pages.dev  */
const DUREE_VERIFICATION = 24 * 3600;
export const emailPret = env => !!(env.RESEND_API_KEY && env.EMAIL_EXPEDITEUR);
export const urlSite = (request, env) => (env.URL_SITE ? String(env.URL_SITE).replace(/\/+$/, "") : new URL(request.url).origin);
const echapperHtml = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function creerVerification(env, membreId) {
  const jeton = versB64Url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM verifications WHERE membre_id = ? OR expire_le < ?").bind(membreId, maintenant()),
    env.DB.prepare("INSERT INTO verifications (token_hash, membre_id, expire_le) VALUES (?, ?, ?)")
      .bind(await sha256Hex(jeton), membreId, maintenant() + DUREE_VERIFICATION)
  ]);
  return jeton;
}

export async function envoyerEmailVerification(env, request, membre, jeton) {
  const lien = `${urlSite(request, env)}/verify?token=${encodeURIComponent(jeton)}`;
  const pseudo = echapperHtml(membre.pseudo);
  const html = `<div style="font-family:Georgia,serif;background:#0c120f;padding:24px;color:#d9d6c9">
  <div style="max-width:520px;margin:auto;border:1px solid #c9a24b;padding:28px;background:#161e1a">
    <h1 style="color:#ecd9a2;font-size:22px;margin:0 0 16px">La Légion des Anciens</h1>
    <p>Bonjour ${pseudo},</p>
    <p>Pour activer votre compte, confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous. Ce lien est valable 24 heures.</p>
    <p style="text-align:center;margin:28px 0"><a href="${lien}" style="background:#c9a24b;color:#1a1002;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:2px;display:inline-block">Confirmer mon adresse</a></p>
    <p style="font-size:13px;color:#a39f8e">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${lien}</p>
    <p style="font-size:13px;color:#a39f8e">Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message : aucun compte ne sera activé.</p>
  </div></div>`;
  const text = `Bonjour ${membre.pseudo},\n\nPour activer votre compte La Légion des Anciens, confirmez votre adresse e-mail avec ce lien (valable 24 heures) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_EXPEDITEUR, to: [membre.email], subject: "Confirmez votre adresse e-mail – La Légion des Anciens", html, text })
    });
    if (!r.ok) console.error("Resend a refusé l'envoi :", r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error("Resend injoignable :", String(e));
    return false;
  }
}
