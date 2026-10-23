// /api/site : annonce, besoins de recrutement et progression des raids
//   GET  -> public (c'est ce que voient tous les visiteurs)
//   POST { data } -> réservé aux officiers
import { reponse, erreur, texte, entier, lireJson, basePrete, origineOk, exigerOfficier, maintenant } from "../_lib/outils.js";

const STATUTS = ["ouvert", "ferme", "prio"];

function nettoyer(d) {
  if (!d || typeof d !== "object") return null;
  const recrutement = {};
  for (const [classe, v] of Object.entries(d.recrutement || {}).slice(0, 20)) {
    const specs = {};
    for (const [spec, s] of Object.entries(v?.specs || {}).slice(0, 10)) if (STATUTS.includes(s)) specs[texte(spec, 40)] = s;
    recrutement[texte(classe, 40)] = { note: texte(v?.note, 80), specs };
  }
  const raids = (Array.isArray(d.raids) ? d.raids : []).slice(0, 15).map(r => {
    const total = Math.max(1, entier(r?.total, 0, 99));
    return { nom: texte(r?.nom, 60), tues: Math.min(entier(r?.tues, 0, 99), total), total, mention: texte(r?.mention, 30), note: texte(r?.note, 200) };
  }).filter(r => r.nom);
  return { annonce: texte(d.annonce, 300), recrutement, raids };
}

export async function onRequestGet({ env }) {
  const pb = basePrete(env); if (pb) return pb;
  const l = await env.DB.prepare("SELECT valeur FROM parametres WHERE cle = 'site'").first();
  let data = {}; try { data = l ? JSON.parse(l.valeur) : {}; } catch {}
  return reponse(data);
}

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  const { echec } = await exigerOfficier(request, env);
  if (echec) return echec;
  const d = await lireJson(request);
  const propre = nettoyer(d?.data);
  if (!propre) return erreur("Données invalides.");
  await env.DB.prepare("INSERT INTO parametres (cle, valeur, maj_le) VALUES ('site', ?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, maj_le = excluded.maj_le")
    .bind(JSON.stringify(propre), maintenant()).run();
  return reponse({ ok: true });
}
