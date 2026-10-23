// Fonction Cloudflare Pages : /api/twitch?channel=nom_de_la_chaine
// Dit au site si la chaîne est EN LIVE (pour le badge rouge et la section « Le Live de la Guilde »).
//
// Réglages à faire dans Cloudflare (voir le guide) :
//   TWITCH_CLIENT_ID      (variable texte)   identifiant de votre application Twitch
//   TWITCH_CLIENT_SECRET  (variable secrète) clé secrète de votre application Twitch
// Sans ces deux réglages, le site fonctionne quand même : il affiche le lecteur Twitch, mais ne sait pas
// dire à l'avance si le live est en cours.

const reponse = (corps, statut = 200, ttl = 0) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": ttl ? `public, max-age=${ttl}` : "no-store" }
  });

// Mémoire de travail (partagée un moment entre les visiteurs) pour ne pas interroger Twitch à chaque fois
const memoire = { token: "", exp: 0, statuts: {} };

async function obtenirToken(env, forcer) {
  const maintenant = Date.now();
  if (!forcer && memoire.token && memoire.exp > maintenant) return memoire.token;
  if (!forcer && env.DB) {
    const l = await env.DB.prepare("SELECT valeur FROM parametres WHERE cle = 'twitch_token'").first();
    try {
      const k = l ? JSON.parse(l.valeur) : null;
      if (k && k.exp > maintenant) { memoire.token = k.token; memoire.exp = k.exp; return k.token; }
    } catch {}
  }
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });
  if (!r.ok) throw new Error("token");
  const d = await r.json();
  const exp = maintenant + Math.max(60, d.expires_in - 3600) * 1000;
  memoire.token = d.access_token; memoire.exp = exp;
  if (env.DB) {
    await env.DB.prepare("INSERT INTO parametres (cle, valeur) VALUES ('twitch_token', ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, maj_le = unixepoch()")
      .bind(JSON.stringify({ token: d.access_token, exp })).run();
  }
  return d.access_token;
}

export async function onRequestGet({ request, env }) {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return reponse({ configure: false }, 200, 300);

  const canal = (new URL(request.url).searchParams.get("channel") || "").toLowerCase();
  if (!/^[a-z0-9_]{3,25}$/.test(canal)) return reponse({ erreur: "Nom de chaîne invalide." }, 400);

  const maintenant = Date.now();
  const connu = memoire.statuts[canal];
  if (connu && connu.exp > maintenant) return reponse(connu.data, 200, 30);

  try {
    let token = await obtenirToken(env, false);
    const appeler = t => fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(canal)}`, {
      headers: { "client-id": env.TWITCH_CLIENT_ID, authorization: "Bearer " + t }
    });
    let r = await appeler(token);
    if (r.status === 401) { token = await obtenirToken(env, true); r = await appeler(token); }
    if (!r.ok) return reponse({ configure: true, erreur: "Twitch indisponible." }, 502);

    const s = (await r.json()).data?.[0];
    const data = s
      ? { configure: true, live: true, titre: String(s.title || "").slice(0, 140), jeu: String(s.game_name || "").slice(0, 60), spectateurs: Number(s.viewer_count) || 0 }
      : { configure: true, live: false };
    if (Object.keys(memoire.statuts).length > 50) memoire.statuts = {};
    memoire.statuts[canal] = { data, exp: maintenant + 45000 };
    return reponse(data, 200, 30);
  } catch {
    return reponse({ configure: true, erreur: "Twitch indisponible." }, 502);
  }
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
