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
  // « m.* » (et non une liste de colonnes) : si le site est mis en ligne avant la migration qui ajoute
  // la colonne « grade », les connexions continuent de fonctionner (grade vaut alors simplement « »).
  return env.DB.prepare(
    `SELECT m.* FROM sessions s
     JOIN membres m ON m.id = s.membre_id WHERE s.token_hash = ? AND s.expire_le > ? AND m.email_verifie = 1`
  ).bind(await sha256Hex(jeton), maintenant()).first();
}
export const profilPublic = m => ({ id: String(m.id), pseudo: m.pseudo, role: m.role, grade: m.grade || "", mdpTemporaire: !!m.mdp_temporaire });

/* ---------- Grades ----------
   Le « grade » s'ajoute au rôle sans le remplacer : une chroniqueuse reste un membre à part entière
   (armurerie, calendrier de raid, roster…) et reçoit en plus le droit de rédiger les chroniques. */
export const GRADES = ["", "chroniqueuse"];
export const peutRediger = m => !!m && (m.role === "officier" || (m.role === "membre" && m.grade === "chroniqueuse"));

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
export async function exigerRedacteur(request, env) {
  const { membre, echec } = await exigerMembre(request, env);
  if (echec) return { echec };
  if (!peutRediger(membre)) return { echec: erreur("Réservé à la chroniqueuse et aux officiers.", 403) };
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
  const verificationUrl = `${urlSite(request, env)}/verify?token=${encodeURIComponent(jeton)}`;
  const pseudo = echapperHtml(membre.pseudo);
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez La Légion des Anciens</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #0b0b0d; font-family: 'Cinzel', Georgia, serif; color: #e5e5e5; -webkit-font-smoothing: antialiased;">

  <!-- Conteneur principal style UI World of Warcraft -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; margin: 0 auto; background-color: #121216; border: 2px solid #c9b037; border-radius: 6px; box-shadow: 0 0 25px rgba(201, 176, 55, 0.25);">

    <!-- En-tête / Header -->
    <tr>
      <td style="padding: 35px 25px 25px 25px; text-align: center; border-bottom: 2px solid #2a2a35; background-color: #1a1a24; background: linear-gradient(180deg, #1a1a24 0%, #121216 100%);">
        <h1 style="margin: 0; font-family: 'Cinzel Decorative', 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; color: #f3e5ab; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 6px rgba(0,0,0,0.9);">
          🛡️ La Légion des Anciens
        </h1>
        <p style="margin: 10px 0 0 0; font-family: 'Cinzel', Georgia, serif; font-size: 11px; font-weight: 600; color: #7289da; text-transform: uppercase; letter-spacing: 1.5px;">
          Guilde PvE World of Warcraft : Forever — Alliance
        </p>
      </td>
    </tr>

    <!-- Corps du message -->
    <tr>
      <td style="padding: 30px 25px; font-family: 'Cinzel', Georgia, serif; font-size: 14px; line-height: 1.7; color: #d1d1d1;">

        <p style="margin-top: 0; font-size: 15px;">
          Bonjour <strong style="color: #f3e5ab; font-weight: 700;">${pseudo}</strong>,
        </p>

        <p>
          C'est avec une grande joie que nous t'accueillons officiellement aux portes de <strong style="color: #ffffff;">La Légion des Anciens</strong> ! Ton compte a bien été créé, et il ne te reste plus qu'une dernière étape pour valider ton inscription et prêter serment :
        </p>

        <!-- Bouton d'activation -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
          <tr>
            <td align="center">
              <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #c9b037; background: linear-gradient(180deg, #c9b037 0%, #8c7323 100%); color: #0a0a0d; text-decoration: none; font-family: 'Cinzel', Georgia, serif; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 15px 30px; border-radius: 4px; border: 1px solid #ffd700; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                Valider mon e-mail et activer mon compte
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #9e9e9e;">
          Une fois ton passeport validé, tu pourras te connecter au site de la guilde, accéder au calendrier secret des raids, enregistrer ton personnage façon <em>Armurerie</em> et t'inscrire pour nos prochaines soirées épiques.
        </p>

        <!-- Lien de secours en texte clair pour compatibilité -->
        <p style="font-size: 12px; color: #7a7a8c; word-break: break-all; margin-top: 15px;">
          Si le bouton ne fonctionne pas, copie cette adresse dans votre navigateur :<br>
          <a href="${verificationUrl}" style="color: #c9b037; text-decoration: underline;">${verificationUrl}</a>
        </p>

        <!-- Séparateur ornemental -->
        <div style="height: 1px; background-color: #c9b037; background: linear-gradient(90deg, transparent, #c9b037, transparent); margin: 30px 0;"></div>

        <!-- Section Foyer -->
        <h3 style="margin: 0 0 12px 0; font-family: 'Cinzel', Georgia, serif; font-size: 15px; font-weight: 700; color: #f3e5ab; text-transform: uppercase; letter-spacing: 1px;">
          🍻 Un petit mot sur notre foyer
        </h3>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #b0b0b0; line-height: 1.6;">
          Chez nous, pas de course au PvE hardcore ou de pression inutile : nous sommes une communauté de vétérans (moyenne d'âge 30-40 ans) qui voulons retrouver l'ambiance chaleureuse, l'entraide et les bons moments du WoW d'autrefois. L'IRL passera toujours avant le jeu !
        </p>

        <!-- Section Étapes -->
        <h3 style="margin: 0 0 12px 0; font-family: 'Cinzel', Georgia, serif; font-size: 15px; font-weight: 700; color: #f3e5ab; text-transform: uppercase; letter-spacing: 1px;">
          🧭 Tes prochains pas :
        </h3>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #b0b0b0; line-height: 1.9;">
          <li><strong style="color: #e5e5e5;">Valide ton e-mail</strong> en cliquant sur le bouton ci-dessus.</li>
          <li><strong style="color: #e5e5e5;">Rejoins-nous sur Discord</strong> pour faire connaissance : <a href="https://discord.com/invite/ks68MWK756" target="_blank" style="color: #7289da; text-decoration: underline; font-weight: 600;">Rejoindre le Discord</a></li>
          <li><strong style="color: #e5e5e5;">Connecte-toi au site</strong> pour configurer ta fiche personnage.</li>
        </ol>

      </td>
    </tr>

    <!-- Pied de page / Footer -->
    <tr>
      <td style="padding: 22px 25px; text-align: center; border-top: 1px solid #2a2a35; background-color: #0d0d10; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-style: italic; font-size: 12px; color: #8a8a8a;">
          "Que la lumière d'Elune et la force de l'Alliance guident tes pas en Azeroth !"
        </p>
        <p style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 12px; font-weight: 700; color: #f3e5ab;">
          L'équipe des Officiers – La Légion des Anciens
        </p>
      </td>
    </tr>

  </table>

</body>
</html>`;
  const text = `Bonjour ${membre.pseudo},\n\nPour activer votre compte La Légion des Anciens, confirmez votre adresse e-mail avec ce lien (valable 24 heures) :\n${verificationUrl}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`;
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
