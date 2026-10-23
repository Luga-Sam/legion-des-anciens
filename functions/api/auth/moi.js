// functions/api/auth/moi.js

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return reponse({ erreur: "Base de données non reliée." }, 500);
  }

  // Récupération du cookie de session si présent
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/legion_session=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) {
    return reponse({ user: null });
  }

  try {
    // Vérification du token dans la table sessions et récupération du membre associé
    const session = await env.DB.prepare(
      `SELECT m.id, m.email, m.pseudo, m.role FROM sessions s 
       JOIN membres m ON m.id = s.membre_id 
       WHERE s.token_hash = ? AND s.expire_le > ?`
    ).bind(token, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return reponse({ user: null });
    }

    return reponse({ 
      user: { 
        id: session.id, 
        email: session.email, 
        pseudo: session.pseudo, 
        role: session.role 
      } 
    });
  } catch (err) {
    return reponse({ user: null });
  }
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
