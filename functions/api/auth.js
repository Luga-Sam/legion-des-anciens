// functions/api/auth.js

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

async function hacherMdp(mdp) {
  const msgUint8 = new TextEncoder().encode(mdp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return reponse({ erreur: "La base de données D1 (DB) n'est pas reliée." }, 500);
  }

  let d;
  try {
    d = await request.json();
  } catch {
    return reponse({ erreur: "Données de formulaire invalides." }, 400);
  }

  const action = d.action;
  const email = String(d.email || "").trim().toLowerCase();
  const password = String(d.password || "");
  const pseudo = String(d.pseudo || "").trim();

  if (action === "inscription") {
    if (!email || !pseudo || password.length < 8) {
      return reponse({ erreur: "Veuillez remplir tous les champs (mot de passe de 8 caractères min)." }, 400);
    }

    const existant = await env.DB.prepare("SELECT id FROM profiles WHERE email = ?").bind(email).first();
    if (existant) {
      return reponse({ erreur: "Cette adresse e-mail est déjà utilisée." }, 400);
    }

    const id = crypto.randomUUID();
    const hash = await hacherMdp(password);

    await env.DB.prepare(
      "INSERT INTO profiles (id, pseudo, email, password_hash, role) VALUES (?, ?, ?, ?, 'en_attente')"
    ).bind(id, pseudo, email, hash).run();

    return reponse({ ok: true, message: "Compte créé ! Un officier doit valider votre accès." });
  }

  if (action === "connexion") {
    const user = await env.DB.prepare("SELECT * FROM profiles WHERE email = ?").bind(email).first();
    if (!user) {
      return reponse({ erreur: "E-mail ou mot de passe incorrect." }, 401);
    }

    const hash = await hacherMdp(password);
    if (hash !== user.password_hash) {
      return reponse({ erreur: "E-mail ou mot de passe incorrect." }, 401);
    }

    return reponse({
      ok: true,
      session: { user: { id: user.id, email: user.email } },
      profil: { id: user.id, pseudo: user.pseudo, role: user.role }
    });
  }

  return reponse({ erreur: "Action non autorisée." }, 400);
}

// Gestion des requêtes GET (notamment /api/auth/moi) pour éviter l'erreur 500
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/moi")) {
    // Si le site demande l'utilisateur courant, on renvoie une session vide ou null pour l'instant
    return reponse({ user: null });
  }
  return reponse({ erreur: "Méthode non autorisée." }, 405);
}

export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
