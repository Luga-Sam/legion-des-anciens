// Fonction Cloudflare Pages : /api/candidature
// Reçoit le formulaire « Postuler » et l'envoie sur le Discord de la guilde.
//
// ⚠️ L'adresse du webhook Discord est un SECRET : quiconque la connaît peut écrire dans votre salon.
// Elle ne doit donc jamais figurer dans index.html. Elle se règle dans Cloudflare :
//   Pages > votre projet > Settings > Variables and Secrets > DISCORD_WEBHOOK_URL (type Secret)

const BLEU_ALLIANCE = 0x3d6fc4;

const reponse = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function onRequestPost({ request, env }) {
  const DISCORD_WEBHOOK_URL = env.DISCORD_WEBHOOK_URL;   // <- la constante du webhook (lue dans Cloudflare)

  let d;
  try { d = await request.json(); } catch { return reponse({ erreur: "Requête invalide." }, 400); }

  // Champ piège pour les robots : on répond « ok » sans rien envoyer
  if (texte(d["bot-field"], 50)) return reponse({ ok: true });

  const c = {
    pseudo: texte(d.pseudo, 30),
    classe: texte(d.classe, 30),
    spe: texte(d.specialisation, 40),
    discord: texte(d.discord, 40),
    experience: texte(d.experience, 120),
    presentation: texte(d.presentation, 1000)
  };
  if (Object.values(c).some(v => !v)) return reponse({ erreur: "Tous les champs sont obligatoires." }, 400);

  if (!DISCORD_WEBHOOK_URL || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(DISCORD_WEBHOOK_URL)) {
    return reponse({ erreur: "Webhook Discord absent ou invalide." }, 500);
  }

  const embed = {
    title: `⚔️ Nouvelle candidature : ${c.pseudo}`,
    description: c.presentation,
    color: BLEU_ALLIANCE,
    fields: [
      { name: "Pseudo WoW", value: c.pseudo, inline: true },
      { name: "Tag Discord", value: c.discord, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Classe", value: c.classe, inline: true },
      { name: "Spécialisation", value: c.spe, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "Âge / Expérience de jeu", value: c.experience }
    ],
    footer: { text: "La Légion des Anciens · Candidature depuis le site" },
    timestamp: new Date().toISOString()
  };

  try {
    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "LegionDesAnciens-Site (candidatures, 1.0)" },
      body: JSON.stringify({
        username: "Recrutement – La Légion des Anciens",
        embeds: [embed],
        allowed_mentions: { parse: [] }   // empêche @everyone / @here dans les textes saisis
      })
    });
    if (!r.ok) {
      // On renvoie la raison donnée par Discord (ex. « Unknown Webhook ») pour faciliter le diagnostic
      let raison = ""; try { raison = (await r.text()).slice(0, 160); } catch {}
      return reponse({ erreur: `Discord a refusé le message (HTTP ${r.status}) ${raison}`.trim() }, 502);
    }
  } catch {
    return reponse({ erreur: "Discord injoignable." }, 502);
  }
  return reponse({ ok: true });
}

// Toute autre méthode que POST est refusée
export const onRequest = () => reponse({ erreur: "Méthode non autorisée." }, 405);
