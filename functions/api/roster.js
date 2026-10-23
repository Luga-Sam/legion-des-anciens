// GET /api/roster : les membres validés et leurs personnages (réservé aux membres connectés)
import { reponse, basePrete, exigerMembre } from "../_lib/outils.js";

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const { echec } = await exigerMembre(request, env);
  if (echec) return echec;
  const { results } = await env.DB.prepare(
    `SELECT m.id AS membre_id, m.pseudo, m.role AS membre_role,
            p.id, p.nom, p.classe, p.specialisation, p.role, p.niveau, p.metier1, p.metier2
     FROM membres m LEFT JOIN personnages p ON p.membre_id = m.id
     WHERE m.role IN ('membre', 'officier')
     ORDER BY m.pseudo COLLATE NOCASE, p.id`
  ).all();
  const parMembre = new Map();
  for (const l of results) {
    if (!parMembre.has(l.membre_id)) parMembre.set(l.membre_id, { id: String(l.membre_id), pseudo: l.pseudo, role: l.membre_role, personnages: [] });
    if (l.id) parMembre.get(l.membre_id).personnages.push({
      id: String(l.id), nom: l.nom, classe: l.classe, specialisation: l.specialisation, role: l.role,
      niveau: l.niveau, metier1: l.metier1, metier2: l.metier2
    });
  }
  return reponse({ membres: [...parMembre.values()] });
}
