/* addons.js : addons recommandés par la guilde
   - lecture ouverte à tous les visiteurs
   - ajout, modification et suppression réservés aux officiers (contrôlé aussi côté serveur) */
let addons = [], jeton = 0;
const CATEGORIES_CONNUES = ["Raids & Boss Mods", "Interface & Confort", "Métiers & Sacs"];
const NIVEAUX = { obligatoire:"Obligatoire", recommande:"Recommandé", confort:"Confort" };
const URL_OK = /^https:\/\/[^\s"'<>\\]+$/;
const dAddon = $("#dlg-addon");

/* ---------- Chargement ---------- */
async function charger(){
  const mien = ++jeton;
  const r = await appel("addons");
  if(mien !== jeton) return;
  const el = $("#addons-liste");
  if(!r.ok){ el.innerHTML = erreurHtml(r); return; }
  addons = r.addons;
  dessiner();
}
// La session est connue au premier signal « legion:session » (puis à chaque connexion / déconnexion)
document.addEventListener("legion:session", charger);

/* ---------- Affichage : une section par catégorie, une carte par addon ---------- */
function carte(a, officier){
  const lien = URL_OK.test(a.lien) ? `<a class="btn btn-or" href="${esc(a.lien)}" target="_blank" rel="noopener noreferrer">Télécharger</a>` : "";
  const gestion = officier ? `<div class="addon-gestion">
      <button type="button" data-edit="${esc(a.id)}">Éditer</button>
      <button type="button" data-suppr="${esc(a.id)}">Supprimer</button></div>` : "";
  return `<article class="addon niv-${esc(a.niveau)}">
    <div class="addon-tete"><h3>${esc(a.nom)}</h3><span class="badge-niv niv-${esc(a.niveau)}">${esc(NIVEAUX[a.niveau] || "")}</span></div>
    <p class="addon-desc">${esc(a.description).replace(/\n/g, "<br>")}</p>
    <div class="addon-pied">${lien}${gestion}</div></article>`;
}
function dessiner(){
  const officier = acces() === "officier";
  $("#addons-barre").hidden = !officier;
  const el = $("#addons-liste");
  if(!addons.length){
    el.innerHTML = `<p class="intro">${officier ? "Aucun addon pour le moment : utilisez « Ajouter un Addon » pour commencer la liste." : "La liste des addons recommandés sera bientôt publiée par les officiers."}</p>`;
    return;
  }
  // Catégories connues d'abord (dans l'ordre), les autres ensuite par ordre alphabétique
  const noms = [...new Set(addons.map(a => a.categorie))].sort((x, y) => {
    const i = CATEGORIES_CONNUES.indexOf(x), j = CATEGORIES_CONNUES.indexOf(y);
    return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || x.localeCompare(y, "fr");
  });
  el.innerHTML = noms.map(n => `<section class="addons-cat"><h2 class="addons-titre">${esc(n)}</h2>
    <div class="addons-grille">${addons.filter(a => a.categorie === n).map(a => carte(a, officier)).join("")}</div></section>`).join("");
}

/* ---------- Gestion (officiers) ---------- */
function majSuggestions(){
  const noms = [...new Set([...CATEGORIES_CONNUES, ...addons.map(a => a.categorie)])];
  $("#ad-categories").innerHTML = noms.map(n => `<option value="${esc(n)}"></option>`).join("");
}
function ouvrirEditeur(a){
  majSuggestions();
  $("#ad-retour").innerHTML = "";
  $("#ad-titre-dlg").textContent = a ? "Modifier l’addon" : "Ajouter un Addon";
  $("#ad-id").value = a ? a.id : "";
  $("#ad-nom").value = a ? a.nom : "";
  $("#ad-categorie").value = a ? a.categorie : "";
  $("#ad-niveau").value = a ? a.niveau : "recommande";
  $("#ad-description").value = a ? a.description : "";
  $("#ad-lien").value = a ? a.lien : "";
  dAddon.showModal();
}
$("#addon-ajouter").onclick = () => ouvrirEditeur(null);
$("#ad-fermer").onclick = () => dAddon.close();
dAddon.addEventListener("click", e => { if(e.target === dAddon) dAddon.close(); });

$("#addons-liste").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b) return;
  if(b.dataset.edit) ouvrirEditeur(addons.find(a => a.id === b.dataset.edit));
  else if(b.dataset.suppr){
    const a = addons.find(x => x.id === b.dataset.suppr);
    if(!a || !confirm("Supprimer l’addon « " + a.nom + " » de la liste ?")) return;
    const r = await appel("addons", { action:"supprimer", id:a.id });
    if(!r.ok){ alert(messageErreur(r)); if(r.statut === 401 || r.statut === 403) majSession(); return; }
    charger();
  }
});

$("#f-addon").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => $("#" + id).value.trim(), bouton = e.target.querySelector("button[type=submit]"), retour = $("#ad-retour"), pid = v("ad-id");
  const addon = { nom:v("ad-nom"), categorie:v("ad-categorie"), niveau:v("ad-niveau"), description:v("ad-description"), lien:v("ad-lien") };
  bouton.disabled = true;
  const r = await appel("addons", pid ? { action:"modifier", id:pid, addon } : { action:"creer", addon });
  bouton.disabled = false;
  if(!r.ok){
    retour.innerHTML = erreurHtml(r);
    if(r.statut === 401 || r.statut === 403) majSession();
    return;
  }
  dAddon.close();
  charger();
});
