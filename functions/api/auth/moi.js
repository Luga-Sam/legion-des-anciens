// GET /api/auth/moi : qui est connecté ? (répond toujours 200 : { membre: null } si personne)
import { reponse, basePrete, membreCourant, profilPublic } from "../../_lib/outils.js";

export async function onRequestGet({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  const m = await membreCourant(request, env);
  return reponse({ membre: m ? profilPublic(m) : null });
}
