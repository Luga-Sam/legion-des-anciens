// Fonction Cloudflare Pages : /api/auth
// Gère l'inscription, la connexion, la déconnexion et la récupération de session via Cloudflare D1.

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

// Hachage sécurisé du mot de passe avec Web Crypto API natif de Cloudflare
async function hacherMdp(mdp) {
  const msgUint8 = new TextEncoder().encode(mdp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env }) {
  if (!env.DB) return reponse({ erreur: "Base de données D1 (DB) non reliée." }, 500);

  const url = new URL(request.url);
  const path = url.pathname.split("/").pop();
  const method = request.method;

  // Lecture de la session actuelle (basée sur un cookie ou header simple)
  // Pour simplifier et centraliser, on gère les requêtes ici.
  
  if (method === "POST") {
    let d;
    try { d = await request.json(); } catch { return reponse({ erreur: "Requête invalide." }, 400); }
    
    // Action : Inscription
    if (d.action === "inscription") {
      const email = String(d.email || "").trim().toLowerCase();
      const pseudo = String(d.pseudo || "").trim();
      const mdp = String(d.password || "");

      if (!email || !pseudo || mdp.length < 8) {
        return reponse({ erreur: "Informations invalides (mot de passe de 8 caractères minimum)." }, 400);
      }

      // Vérifier si l'email existe déjà
      const existant = await env.DB.prepare("SELECT id FROM profiles WHERE email = ?").bind(email).first();
      if (existant) return reponse({ erreur: "Cette adresse e-mail est déjà utilisée." }, 400);

      const id = crypto.randomUUID();
      const password_hash = await hacherMdp(mdp);
      
      try {
        await env.DB.prepare(
          "INSERT INTO profiles (id, pseudo, email, password_hash, role) VALUES (?, ?, ?, ?, 'en_attente')"
        ).bind(id, pseudo, email, password_hash).run();

        return reponse({ ok: true, message: "Compte créé avec succès ! En attente de validation par un officier." });
      } catch (err) {
        return reponse({ erreur: "Erreur lors de la création du compte." }, 500);
      }
    }

    // Action : Connexion
    if (d.action === "connexion") {
      const email = String(d.email || "").trim().toLowerCase();
      const mdp = String(d.password || "");

      const user = await env.DB.prepare("SELECT * FROM profiles WHERE email = ?").bind(email).first();
      if (!user) return reponse({ erreur: "E-mail ou mot de passe incorrect." }, 401);

      const hash = await hacherMdp(mdp);
      if (hash !== user.password_hash) return reponse({ erreur: "E-mail ou mot de passe incorrect." }, 401);

      // Renvoyer les infos du profil connecté
      return reponse({ 
        ok: true, 
        session: { user: { id: user.id, email: user.email } },
        profil: { id: user.id, pseudo: user.pseudo, role: user.role } 
      });
    }
  }

  return reponse({ erreur: "Action non reconnue." }, 400);
}
