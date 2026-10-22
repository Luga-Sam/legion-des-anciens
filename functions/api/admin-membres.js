export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { action, userId, targetId, nouveauRole, personnage, raid } = body;

    // 1. Lister les membres (Espace Officier)
    if (action === "lister") {
      const { results } = await env.DB.prepare(`SELECT id, pseudo, role, cree_le FROM profiles ORDER BY cree_le DESC`).all();
      return new Response(JSON.stringify({ membres: results }), { status: 200 });
    }

    // 2. Modifier le rôle d'un membre
    if (action === "modifier_role") {
      await env.DB.prepare(`UPDATE profiles SET role = ? WHERE id = ?`).bind(nouveauRole, targetId).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 3. Sauvegarder un personnage (Armurerie)
    if (action === "sauvegarder_personnage") {
      if (!userId || !personnage?.nom) {
        return new Response(JSON.stringify({ erreur: "Informations manquantes" }), { status: 400 });
      }
      if (personnage.id) {
        await env.DB.prepare(`UPDATE personnages SET nom=?, classe=?, specialisation=?, role=?, niveau=?, metier1=?, metier2=? WHERE id=? AND user_id=?`)
          .bind(personnage.nom, personnage.classe, personnage.specialisation, personnage.role, personnage.niveau, personnage.metier1, personnage.metier2, personnage.id, userId).run();
      } else {
        const newId = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO personnages (id, user_id, nom, classe, specialisation, role, niveau, metier1, metier2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(newId, userId, personnage.nom, personnage.classe, personnage.specialisation, personnage.role, personnage.niveau, personnage.metier1, personnage.metier2).run();
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 4. Créer un raid (Calendrier / Officier)
    if (action === "creer_raid") {
      if (!raid?.titre || !raid?.date) {
        return new Response(JSON.stringify({ erreur: "Titre et date requis" }), { status: 400 });
      }
      const newId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO raids (id, titre, date_raid, rassemblement, debut, tank, soigneur, dps, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ouvert')`)
        .bind(newId, raid.titre, raid.date, raid.rassemblement, raid.debut, raid.tank, raid.soigneur, raid.dps).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ erreur: "Action inconnue" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ erreur: err.message }), { status: 500 });
  }
}
