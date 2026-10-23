// functions/api/auth/moi.js

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

export async function onRequestGet({ request, env }) {
  // Pour l'instant, on renvoie un utilisateur vide pour stopper net l'erreur 500 et laisser le site respirer
  return reponse({ user: null });
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
