// Fonction Cloudflare Pages : /api/raids  (calendrier de raid + inscriptions + roster)
// - GET  -> tout le monde lit les raids à venir et leurs inscrits
// - POST -> action "inscrire" / "retirer" (public, avec le jeton du navigateur du joueur)
//           actions officiers (avec le code d'accès) : tout, creer, statut, roster, archiver, supprimer, retirer
// Utilise la liaison KV « LEGION » et la variable secrète « OFFICER_CODE » (déjà réglées pour /api/data).

const ROLES = ["tank", "soigneur", "dps"];
const PRESENCES = ["present", "retard", "absent"];
const ETATS = ["attente", "confirme", "remplacant"];
const STATUTS = ["ouvert", "complet", "annule"];
const MAX_RAIDS = 40, MAX_INSCRITS = 60;

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const entier = (v, min, max) => Math.max(min, Math.min(max, parseInt(v, 10) || 0));
const heure = v => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim()) ? v.trim() : "");
const jour = v => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : "");

async function empreinte(x) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(x))));
}
async function memeCode(a, b) {
  const [x, y] = await Promise.all([empreinte(a), empreinte(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const lire = async env => (await env.LEGION.get("raids", "json")) || { raids: [] };
const ecrire = (env, d) => env.LEGION.put("raids", JSON.stringify(d));
// Les jetons (qui prouvent qu'une inscription vient du bon navigateur) ne sortent jamais du serveur
const sansJeton = r => ({ ...r, inscriptions: r.inscriptions.map(({ jeton, ...i }) => i) });
const cle = p => p.toLowerCase();

export async function onRequestGet({ env }) {
  if (!env.LEGION) return reponse({ erreur: "Le stockage KV (LEGION) n'est pas relié au projet." }, 500);
  const d = await lire(env);
  return reponse({ raids: d.raids.filter(r => !r.archive).map(sansJeton) });
}

export async function onRequestPost({ request, env }) {
  if (!env.LEGION) return reponse({ erreur: "Le stockage KV (LEGION) n'est pas relié au projet." }, 500);
  let c;
  try { c = await request.json(); } catch { return reponse({ erreur: "Requête invalide." }, 400); }
  if (texte(c["bot-field"], 50)) return reponse({ ok: true });   // robot

  const action = texte(c.action, 20);
  const donnees = await lire(env);
  const raid = donnees.raids.find(r => r.id === texte(c.raidId, 20));

  // ---------- Actions publiques ----------
  if (action === "inscrire") {
    if (!raid || raid.archive) return reponse({ erreur: "Ce raid n'existe plus." }, 404);
    if (raid.statut === "annule") return reponse({ erreur: "Ce raid est annulé." }, 409);
    const j = texte(c.jeton, 64), x = c.inscription || {};
    const ins = {
      pseudo: texte(x.pseudo, 24), classe: texte(x.classe, 30), spe: texte(x.spe, 40),
      role: x.role, presence: x.presence, heure: heure(x.heure), note: texte(x.note, 120)
    };
    if (!ins.pseudo || !ins.classe || !ins.spe || !ROLES.includes(ins.role) || !PRESENCES.includes(ins.presence) || j.length < 10) {
      return reponse({ erreur: "Merci de remplir tous les champs obligatoires." }, 400);
    }
    if (ins.presence !== "retard") ins.heure = "";
    const existant = raid.inscriptions.find(i => cle(i.pseudo) === cle(ins.pseudo));
    if (existant) {
      if (existant.jeton !== j) return reponse({ erreur: "Ce personnage est déjà inscrit depuis un autre appareil. Contactez un officier pour le modifier." }, 409);
      Object.assign(existant, ins);                 // mise à jour de sa propre inscription
    } else {
      if (raid.inscriptions.length >= MAX_INSCRITS) return reponse({ erreur: "Le nombre maximal d'inscriptions est atteint." }, 409);
      raid.inscriptions.push({ ...ins, etat: "attente", jeton: j });
    }
    await ecrire(env, donnees);
    return reponse({ ok: true });
  }

  if (action === "retirer" && !c.code) {
    if (!raid) return reponse({ erreur: "Ce raid n'existe plus." }, 404);
    const p = texte(c.pseudo, 24), j = texte(c.jeton, 64);
    const i = raid.inscriptions.findIndex(x => cle(x.pseudo) === cle(p) && x.jeton === j);
    if (i < 0) return reponse({ erreur: "Inscription introuvable." }, 404);
    raid.inscriptions.splice(i, 1);
    await ecrire(env, donnees);
    return reponse({ ok: true });
  }

  // ---------- Actions réservées aux officiers ----------
  const attendu = env.OFFICER_CODE;
  if (!attendu) return reponse({ erreur: "Le code officier n'est pas encore configuré sur Cloudflare." }, 500);
  if (!(await memeCode(c.code ?? "", attendu))) {
    await new Promise(r => setTimeout(r, 1200));
    return reponse({ erreur: "Code incorrect." }, 401);
  }
  const tout = () => reponse({ ok: true, raids: donnees.raids.map(sansJeton) });

  switch (action) {
    case "tout":
      return tout();
    case "creer": {
      const x = c.raid || {};
      const r = {
        id: crypto.randomUUID().slice(0, 8),
        titre: texte(x.titre, 60), date: jour(x.date),
        rassemblement: heure(x.rassemblement), debut: heure(x.debut),
        description: texte(x.description, 300),
        compo: { tank: entier(x.tank, 0, 40), soigneur: entier(x.soigneur, 0, 40), dps: entier(x.dps, 0, 40) },
        statut: "ouvert", archive: false, inscriptions: []
      };
      if (!r.titre || !r.date || !r.rassemblement || !r.debut) return reponse({ erreur: "Titre, date et heures sont obligatoires." }, 400);
      if (donnees.raids.length >= MAX_RAIDS) return reponse({ erreur: "Trop de raids enregistrés : supprimez les anciens." }, 409);
      donnees.raids.push(r);
      break;
    }
    case "statut":
      if (!raid || !STATUTS.includes(c.statut)) return reponse({ erreur: "Requête invalide." }, 400);
      raid.statut = c.statut;
      break;
    case "roster": {
      const i = raid?.inscriptions.find(x => cle(x.pseudo) === cle(texte(c.pseudo, 24)));
      if (!i || !ETATS.includes(c.etat)) return reponse({ erreur: "Inscription introuvable." }, 404);
      i.etat = c.etat;
      break;
    }
    case "retirer": {
      if (!raid) return reponse({ erreur: "Raid introuvable." }, 404);
      raid.inscriptions = raid.inscriptions.filter(x => cle(x.pseudo) !== cle(texte(c.pseudo, 24)));
      break;
    }
    case "archiver":
      if (!raid) return reponse({ erreur: "Raid introuvable." }, 404);
      raid.archive = !!c.archive;
      break;
    case "supprimer":
      if (!raid) return reponse({ erreur: "Raid introuvable." }, 404);
      donnees.raids = donnees.raids.filter(r => r !== raid);
      break;
    default:
      return reponse({ erreur: "Action inconnue." }, 400);
  }
  await ecrire(env, donnees);
  return tout();
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
