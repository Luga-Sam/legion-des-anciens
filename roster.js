/* roster.js : « Mon personnage » (armurerie) et liste des membres de la guilde */
let membresRoster = [], filtreRole = "tous", recherche = "";

function dessinerPersos(){
  const el = $("#persos");
  if(!profil){ el.innerHTML = ""; return; }
  el.innerHTML = mesPersos.map(p => carteDe({ ...p, joueur:"" }, `<div class="perso-actions">
      <button type="button" class="btn btn-ligne petit" data-edit="${esc(p.id)}">Modifier</button>
      <button type="button" class="btn btn-ligne petit" data-suppr-perso="${esc(p.id)}">Supprimer</button></div>`)).join("")
    || '<p class="intro">Aucun personnage pour le moment. Ajoutez le vôtre : il sera proposé automatiquement à chaque inscription à un raid.</p>';
}
$("#persos").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b) return;
  if(b.dataset.edit) ouvrirPerso(mesPersos.find(p => p.id === b.dataset.edit));
  else if(b.dataset.supprPerso){
    const p = mesPersos.find(x => x.id === b.dataset.supprPerso);
    if(!confirm("Supprimer " + p.nom + " ? Ses inscriptions aux raids seront aussi supprimées.")) return;
    const { error } = await sb.from("personnages").delete().eq("id", p.id);
    if(error) return alert(messageErreur(error));
    await chargerPersos(); signaler("persos"); signaler("calendrier");
  }
});
$("#perso-ajouter").onclick = () => ouvrirPerso(null);
$("#armu-deco").onclick = () => { if(sb) sb.auth.signOut(); };

function majMonPerso(){
  const connecte = !!(SB_OK && session && profil), a = acces();
  $("#mon-personnage").hidden = !connecte;
  if(!connecte) return;
  $("#armu-statut").textContent = a === "officier" ? "Compte officier" : a === "membre" ? "Compte membre validé" : a === "refuse" ? "Accès non accepté : contactez un officier" : "Compte en attente de validation par un officier";
  dessinerPersos();
}

/* ---------- Liste des membres (réservée aux membres) ---------- */
const FILTRES_ROLE = [["tous", "Tous"], ["tank", "Tanks"], ["soigneur", "Soigneurs"], ["dps", "DPS"]];
FILTRES_ROLE.forEach(([cle, texte]) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = texte; b.setAttribute("aria-pressed", cle === filtreRole);
  b.onclick = () => {
    filtreRole = cle;
    $("#r-filtres").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    dessinerRoster();
  };
  $("#r-filtres").append(b);
});
$("#r-recherche").addEventListener("input", e => { recherche = e.target.value.trim().toLowerCase(); dessinerRoster(); });

async function chargerRoster(){
  if(!sb || !estMembre()) return;
  const { data, error } = await sb.from("profiles").select("id, pseudo, role, personnages(*)").in("role", ["membre", "officier"]).order("pseudo");
  if(error) return;
  membresRoster = data || [];
  dessinerRoster();
}
function dessinerRoster(){
  const el = $("#roster-liste"), a = acces();
  const outils = $("#roster-outils"), resume = $("#roster-resume");
  if(!sessionPrete){ outils.hidden = true; resume.textContent = ""; el.innerHTML = '<p class="intro">Chargement…</p>'; return; }
  if(!estMembre()){
    outils.hidden = true; resume.textContent = "";
    if(a === "en_attente") el.innerHTML = verrou("Votre compte est en attente de validation par un officier. Le roster s’ouvrira dès qu’il sera approuvé.");
    else if(a === "refuse") el.innerHTML = verrou("Votre demande d’accès n’a pas été acceptée. Contactez un officier sur notre Discord.");
    else el.innerHTML = verrou("Cette section est réservée aux membres de La Légion des Anciens. Veuillez vous connecter ou créer un compte.",
      '<div class="actions"><button type="button" class="btn btn-or" data-auth="connexion">Se connecter</button><button type="button" class="btn btn-ligne" data-auth="inscription">Créer un compte</button></div>');
    return;
  }
  outils.hidden = false;
  const lignes = membresRoster.map(m => ({ ...m, persos:(m.personnages || []).filter(p =>
      (filtreRole === "tous" || p.role === filtreRole) &&
      (!recherche || [p.nom, p.classe, p.specialisation, m.pseudo].some(t => String(t).toLowerCase().includes(recherche))))
    })).filter(m => m.persos.length)
    .sort((x, y) => (y.role === "officier") - (x.role === "officier") || x.pseudo.localeCompare(y.pseudo));
  const nbPersos = lignes.reduce((n, m) => n + m.persos.length, 0);
  const parRole = k => lignes.reduce((n, m) => n + m.persos.filter(p => p.role === k).length, 0);
  resume.textContent = `${lignes.length} membre${lignes.length > 1 ? "s" : ""} · ${nbPersos} personnage${nbPersos > 1 ? "s" : ""} · ${parRole("tank")} tank${parRole("tank") > 1 ? "s" : ""} · ${parRole("soigneur")} soigneur${parRole("soigneur") > 1 ? "s" : ""} · ${parRole("dps")} DPS`;
  el.innerHTML = lignes.map(m => `<div class="membre">
      <div class="membre-nom">${esc(m.pseudo)}${m.role === "officier" ? '<em class="pastille ok">Officier</em>' : ""}<small>${m.persos.length} personnage${m.persos.length > 1 ? "s" : ""}</small></div>
      <div class="persos">${m.persos.map(p => carteDe({ ...p, joueur:"" })).join("")}</div></div>`).join("")
    || '<p class="intro">Aucun personnage ne correspond à cette recherche.</p>';
}
$("#roster-liste").addEventListener("click", e => { const b = e.target.closest("button"); if(b && b.dataset.auth) ouvrirAuth(b.dataset.auth); });

document.addEventListener("legion:session", () => {
  majMonPerso();
  if(estMembre()) chargerRoster(); else { membresRoster = []; dessinerRoster(); }
});
document.addEventListener("legion:persos", () => { dessinerPersos(); if(estMembre()) chargerRoster(); });
dessinerRoster();
