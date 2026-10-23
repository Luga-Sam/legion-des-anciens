// POST /api/auth/deconnexion
import { reponse, erreur, basePrete, origineOk, detruireSession, cookieEffacer } from "../../_lib/outils.js";

export async function onRequestPost({ request, env }) {
  const pb = basePrete(env); if (pb) return pb;
  if (!origineOk(request)) return erreur("Origine refusée.", 403);
  await detruireSession(request, env);
  return reponse({ ok: true }, 200, { "set-cookie": cookieEffacer(request) });
}
