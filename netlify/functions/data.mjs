// Fonction Netlify : lit et enregistre les infos du site (annonce, recrutement, progression).
// - GET  /api/data  -> tout le monde peut lire (c'est ce qu'affiche le site)
// - POST /api/data  -> réservé aux officiers : il faut envoyer le bon code d'accès
// Le code d'accès n'est PAS dans ce fichier : il se règle dans Netlify (variable OFFICER_CODE).
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const STATUTS = ["ouvert", "ferme", "prio"];
const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const entier = v => Math.max(0, Math.min(99, parseInt(v, 10) || 0));

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

const memeCode = (a, b) => {
  const h = x => createHash("sha256").update(String(x)).digest();
  return timingSafeEqual(h(a), h(b));
};

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

export default async (req) => {
  const store = getStore("legion");

  if (req.method === "GET") {
    return reponse((await store.get("site", { type: "json" })) || {});
  }

  if (req.method === "POST") {
    let corps;
    try { corps = await req.json(); } catch { return reponse({ erreur: "Requête invalide." }, 400); }

    const attendu = process.env.OFFICER_CODE;
    if (!attendu) return reponse({ erreur: "Le code officier n'est pas encore configuré sur Netlify." }, 500);

    if (!memeCode(corps.code ?? "", attendu)) {
      await new Promise(r => setTimeout(r, 1200)); // ralentit les essais au hasard
      return reponse({ erreur: "Code incorrect." }, 401);
    }
    if (corps.verifier) return reponse({ ok: true });

    const propre = nettoyer(corps.data);
    if (!propre) return reponse({ erreur: "Données invalides." }, 400);
    await store.setJSON("site", propre);
    return reponse({ ok: true });
  }

  return reponse({ erreur: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/data" };
