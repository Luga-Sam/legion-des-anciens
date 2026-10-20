// Fonction Cloudflare Pages : /api/data
// - GET  -> tout le monde peut lire (c'est ce qu'affiche le site)
// - POST -> réservé aux officiers : il faut envoyer le bon code d'accès
//
// Réglages à faire dans Cloudflare (voir le guide) :
//   - Liaison KV nommée        LEGION        (stockage des infos du site)
//   - Variable secrète nommée  OFFICER_CODE  (le code d'accès des officiers)

const STATUTS = ["ouvert", "ferme", "prio"];
const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const entier = v => Math.max(0, Math.min(99, parseInt(v, 10) || 0));

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

// Comparaison du code sans révéler, par le temps de réponse, combien de caractères sont justes
async function empreinte(x) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(x))));
}
async function memeCode(a, b) {
  const [x, y] = await Promise.all([empreinte(a), empreinte(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// Vérifie et nettoie ce qui est envoyé avant de l'enregistrer
function nettoyer(d) {
  if (!d || typeof d !== "object") return null;
  const recrutement = {};
  for (const [classe, v] of Object.entries(d.recrutement || {}).slice(0, 20)) {
    const specs = {};
    for (const [spec, s] of Object.entries(v?.specs || {}).slice(0, 10)) {
      if (STATUTS.includes(s)) specs[texte(spec, 40)] = s;
    }
    recrutement[texte(classe, 40)] = { note: texte(v?.note, 80), specs };
  }
  const raids = (Array.isArray(d.raids) ? d.raids : [])
    .slice(0, 15)
    .map(r => {
      const total = Math.max(1, entier(r?.total));
      return {
        nom: texte(r?.nom, 60),
        tues: Math.min(entier(r?.tues), total),
        total,
        mention: texte(r?.mention, 30),
        note: texte(r?.note, 200)
      };
    })
    .filter(r => r.nom);
  return { annonce: texte(d.annonce, 300), recrutement, raids };
}

export async function onRequestGet({ env }) {
  if (!env.LEGION) return reponse({ erreur: "Le stockage KV (LEGION) n'est pas relié au projet." }, 500);
  return reponse((await env.LEGION.get("site", "json")) || {});
}

export async function onRequestPost({ request, env }) {
  let corps;
  try { corps = await request.json(); } catch { return reponse({ erreur: "Requête invalide." }, 400); }

  const attendu = env.OFFICER_CODE;
  if (!attendu) return reponse({ erreur: "Le code officier n'est pas encore configuré sur Cloudflare." }, 500);

  if (!(await memeCode(corps.code ?? "", attendu))) {
    await new Promise(r => setTimeout(r, 1200)); // ralentit les essais au hasard
    return reponse({ erreur: "Code incorrect." }, 401);
  }
  if (corps.verifier) return reponse({ ok: true });

  if (!env.LEGION) return reponse({ erreur: "Le stockage KV (LEGION) n'est pas relié au projet." }, 500);
  const propre = nettoyer(corps.data);
  if (!propre) return reponse({ erreur: "Données invalides." }, 400);
  await env.LEGION.put("site", JSON.stringify(propre));
  return reponse({ ok: true });
}

// Toute autre méthode (PUT, DELETE...) est refusée
export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
