// functions/api/admin-membres.js

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return reponse({ erreur: "Base de données D1 non reliée." }, 500);
  }

  let d;
  try {
    d = await request.json();
  } catch {
    return reponse({ erreur: "Données invalides." }, 400);
  }

  const { action, userId, targetId, nouveauRole } = d;

  if (!userId) {
    return reponse({ erreur: "Non autorisé." }, 401);
  }

  // Vérification que l'utilisateur qui fait la requête est bien officier
  const adminUser = await env.DB.prepare("SELECT role FROM profiles WHERE id = ?").bind(userId).first();
  if (!adminUser || adminUser.role !== "officier") {
    return reponse({ erreur: "Accès réservé aux officiers." }, 403);
  }

  if (action === "lister") {
    const { results } = await env.DB.prepare("SELECT id, pseudo, email, role, created_at as cree_le FROM profiles ORDER BY created_at DESC").all();
    return reponse({ ok: true, membres: results });
  }

  if (action === "modifier_role") {
    const rolesPermis = ["en_attente", "membre", "officier", "refuse"];
    if (!rolesPermis.includes(nouveauRole)) {
      return reponse({ erreur: "Rôle invalide." }, 400);
    }

    await env.DB.prepare("UPDATE profiles SET role = ? WHERE id = ?").bind(nouveauRole, targetId).run();
    return reponse({ ok: true });
  }

  return reponse({ erreur: "Action non reconnue." }, 400);
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
