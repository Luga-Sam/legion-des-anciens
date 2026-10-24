/* chroniques.js : « Les Chroniques des Anciens », le blog de la guilde
   - lecture libre pour tous les visiteurs ; commentaires réservés aux membres validés
   - rédaction réservée à la chroniqueuse (grade) et aux officiers */
let courante = null, jeton = 0;
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day:"numeric", month:"long", year:"numeric" });
const dateDe = t => fmtLong.format(new Date(t * 1000));
const URL_IMG = /^https:\/\/[^\s"'<>\\]+$/;
const peutRediger = () => !!profil && (acces() === "officier" || (acces() === "membre" && profil.grade === "chroniqueuse"));
const dChro = $("#dlg-chro");

/* ---------- Mise en forme du texte (balisage simple, jamais de HTML brut : tout est échappé) ---------- */
function inline(t){
  return esc(t)
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
}
function rendreTexte(brut){
  return String(brut || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map(b => {
    const bloc = b.trim();
    if(!bloc) return "";
    if(/^-{3,}$/.test(bloc)) return '<hr class="orn">';
    const img = /^!\[([^\]\n]*)\]\((https:\/\/[^\s)"'<>]+)\)$/.exec(bloc);
    if(img) return `<figure><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy" referrerpolicy="no-referrer">${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ""}</figure>`;
    if(/^##\s/.test(bloc)) return `<h3>${inline(bloc.replace(/^##\s+/, "").replace(/\n/g, " "))}</h3>`;
    const lignes = bloc.split("\n");
    if(lignes.every(l => /^>/.test(l))){
      const txt = lignes.map(l => l.replace(/^>\s?/, ""));
      let cite = "";
      if(txt.length > 1 && /^(—|--|–)\s*\S/.test(txt[txt.length - 1])) cite = txt.pop().replace(/^(—|--|–)\s*/, "");
      return `<blockquote><p>${txt.map(inline).join("<br>")}</p>${cite ? `<cite>— ${inline(cite)}</cite>` : ""}</blockquote>`;
    }
    if(lignes.every(l => /^[-•]\s+/.test(l))) return `<ul>${lignes.map(l => `<li>${inline(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    return `<p>${lignes.map(inline).join("<br>")}</p>`;
  }).join("");
}

/* ---------- Navigation : #chronique-12 ouvre une chronique, sinon on voit la liste ---------- */
const idHash = () => (/^#chronique-(\d+)$/.exec(location.hash) || [])[1] || "";
async function route(){
  const i = idHash();
  $("#chro-liste").hidden = !!i;
  $("#chro-lecture").hidden = !i;
  $("#chro-barre").hidden = !peutRediger();
  if(i) await chargerChronique(i); else await chargerListe();
}
addEventListener("hashchange", () => { scrollTo(0, 0); route(); });
document.addEventListener("legion:session", route);   // se déclenche dès que la session est connue (puis à chaque connexion / déconnexion)

/* ---------- Liste : « notes d'aventuriers » ---------- */
async function chargerListe(){
  const mien = ++jeton;
  const r = await appel("chroniques");
  if(mien !== jeton) return;
  const el = $("#chro-liste");
  if(!r.ok){ el.innerHTML = erreurHtml(r); return; }
  el.innerHTML = r.chroniques.map(carte).join("")
    || '<p class="intro">Aucune chronique pour le moment. Les premiers récits de la Légion arrivent bientôt…</p>';
}
function carte(c){
  const img = c.image && URL_IMG.test(c.image) ? `<div class="note-image"><img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>` : "";
  return `<a class="note${c.publie ? "" : " brouillon"}" href="#chronique-${esc(c.id)}">${img}
    <div class="note-papier">
      <span class="note-date">${esc(dateDe(c.date))}${c.publie ? "" : '<em class="pastille">Brouillon</em>'}</span>
      <h3>${esc(c.titre)}</h3>
      <p>${esc(c.apercu)}</p>
      <div class="note-pied"><span>Par <b>${esc(c.auteur)}</b></span><span>💬 ${+c.nbCom}</span></div>
    </div></a>`;
}

/* ---------- Lecture d'une chronique ---------- */
async function chargerChronique(i){
  const mien = ++jeton;
  const r = await appel("chroniques?id=" + encodeURIComponent(i));
  if(mien !== jeton) return;
  const el = $("#chro-lecture");
  if(!r.ok){
    courante = null;
    el.innerHTML = `<a class="chro-retour" href="#liste">← Toutes les chroniques</a>${erreurHtml(r)}`;
    return;
  }
  courante = r;
  dessinerLecture();
}
function commentaire(k){
  return `<li class="chro-com"><div class="chro-com-tete"><b>${esc(k.auteur)}</b>`
    + (k.chroniqueuse ? '<em class="pastille ok">Chroniqueuse</em>' : "") + (k.officier ? '<em class="pastille ok">Officier</em>' : "")
    + `<small>${esc(dateDe(k.date))}</small>`
    + (k.supprimable ? `<button type="button" class="x" data-supprcom="${esc(k.id)}" aria-label="Supprimer ce commentaire">✕</button>` : "")
    + `</div><p>${esc(k.contenu).replace(/\n/g, "<br>")}</p></li>`;
}
function zoneCommentaires(c, coms){
  let saisie;
  if(!c.publie) saisie = '<p class="intro petite">Les commentaires s’ouvriront à la publication de la chronique.</p>';
  else if(estMembre()) saisie = `<form id="f-com"><label for="com-txt">Laisser un commentaire
      <textarea id="com-txt" required minlength="2" maxlength="600" style="min-height:90px" placeholder="Votre réaction, un souvenir, un clin d’œil…"></textarea></label>
      <button class="btn btn-or petit" type="submit">Publier mon commentaire</button><div id="com-retour" role="status"></div></form>`;
  else if(!profil) saisie = verrou("Connectez-vous avec votre compte membre pour commenter cette chronique.",
    '<div class="actions"><button type="button" class="btn btn-or" data-auth="connexion">Se connecter</button><button type="button" class="btn btn-ligne" data-auth="inscription">Créer un compte</button></div>');
  else saisie = verrou("Les commentaires sont réservés aux membres validés de la guilde. Contactez un officier sur notre Discord.");
  return `<section class="chro-coms" aria-label="Commentaires"><h3>Commentaires <small>(${coms.length})</small></h3>
    <ul class="chro-com-liste">${coms.map(commentaire).join("") || '<li class="chro-com vide">Aucun commentaire pour le moment.</li>'}</ul>${saisie}</section>`;
}
function dessinerLecture(){
  const c = courante.chronique, coms = courante.commentaires;
  const couv = c.image && URL_IMG.test(c.image) ? `<figure class="chro-couv"><img src="${esc(c.image)}" alt="" referrerpolicy="no-referrer"></figure>` : "";
  const actions = c.modifiable ? `<div class="chro-actions">
      <button type="button" class="btn btn-ligne petit" data-modifier>Modifier</button>
      <button type="button" class="btn btn-ligne petit" data-publier>${c.publie ? "Repasser en brouillon" : "Publier"}</button>
      <button type="button" class="btn btn-ligne petit" data-suppr>Supprimer</button></div>` : "";
  $("#chro-lecture").innerHTML = `<a class="chro-retour" href="#liste">← Toutes les chroniques</a>
    <article class="chro-cadre">${couv}
      <div class="chro-papier">
        <div class="chro-tete">
          <span class="note-date">${esc(dateDe(c.date))}${c.publie ? "" : '<em class="pastille">Brouillon</em>'}</span>
          <h2>${esc(c.titre)}</h2>
          <p class="chro-signature">Consigné par <b>${esc(c.auteur)}</b></p>
        </div>
        <div class="chro-corps">${rendreTexte(c.contenu)}</div>
        <div class="chro-sceau" aria-hidden="true">✦ ✦ ✦</div>
      </div>${actions}
    </article>${zoneCommentaires(c, coms)}`;
  document.title = c.titre + " – Les Chroniques des Anciens";
}

$("#chro-lecture").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b || !courante) return;
  const c = courante.chronique;
  if(b.dataset.auth) ouvrirAuth(b.dataset.auth);
  else if("modifier" in b.dataset) ouvrirEditeur(c);
  else if("publier" in b.dataset){
    b.disabled = true;
    const r = await appel("chroniques", { action:"modifier", id:c.id, chronique:{ titre:c.titre, extrait:c.extrait, contenu:c.contenu, image:c.image, publie:!c.publie } });
    if(!r.ok){ b.disabled = false; alert(messageErreur(r)); return; }
    chargerChronique(c.id);
  }else if("suppr" in b.dataset){
    if(!confirm("Supprimer définitivement cette chronique et ses commentaires ?")) return;
    const r = await appel("chroniques", { action:"supprimer", id:c.id });
    if(!r.ok){ alert(messageErreur(r)); return; }
    history.pushState(null, "", location.pathname); document.title = "Les Chroniques des Anciens – La Légion des Anciens"; route();
  }else if(b.dataset.supprcom){
    if(!confirm("Supprimer ce commentaire ?")) return;
    const r = await appel("chroniques", { action:"supprimer_commentaire", commentaireId:b.dataset.supprcom });
    if(!r.ok) alert(messageErreur(r)); else chargerChronique(c.id);
  }
});
$("#chro-lecture").addEventListener("submit", async e => {
  if(e.target.id !== "f-com") return;
  e.preventDefault();
  const bouton = e.target.querySelector("button[type=submit]"), retour = $("#com-retour");
  bouton.disabled = true;
  const r = await appel("chroniques", { action:"commenter", chroniqueId:courante.chronique.id, contenu:$("#com-txt").value.trim() });
  bouton.disabled = false;
  if(!r.ok){ retour.innerHTML = erreurHtml(r); if(r.statut === 401 || r.statut === 403) majSession(); return; }
  chargerChronique(courante.chronique.id);
});

/* ---------- Éditeur (chroniqueuse et officiers) ---------- */
$("#chro-nouvelle").onclick = () => ouvrirEditeur(null);
function montrerApercu(oui){
  $("#ch-apercu-btn").setAttribute("aria-pressed", oui);
  $("#ch-apercu-btn").textContent = oui ? "Modifier" : "Aperçu";
  $("#ch-contenu").hidden = oui;
  $("#ch-apercu").hidden = !oui;
  if(oui) $("#ch-apercu").innerHTML = `<div class="chro-corps">${rendreTexte($("#ch-contenu").value) || "<p><em>Rien à afficher pour le moment.</em></p>"}</div>`;
}
function ouvrirEditeur(c){
  $("#ch-retour").innerHTML = "";
  $("#ch-titre-dlg").textContent = c ? "Modifier la chronique" : "Rédiger une chronique";
  $("#ch-id").value = c ? c.id : "";
  $("#ch-titre").value = c ? c.titre : "";
  $("#ch-extrait").value = c ? c.extrait : "";
  $("#ch-image").value = c ? c.image : "";
  $("#ch-contenu").value = c ? c.contenu : "";
  $("#ch-statut").value = c && c.publie ? "1" : "0";
  montrerApercu(false);
  dChro.showModal();
}
$("#ch-fermer").onclick = () => dChro.close();
dChro.addEventListener("click", e => { if(e.target === dChro) dChro.close(); });
$("#ch-apercu-btn").onclick = () => montrerApercu($("#ch-apercu-btn").getAttribute("aria-pressed") !== "true");

// Boutons de mise en forme : [texte avant, texte après, texte par défaut]
const INSERTIONS = {
  gras:["**", "**", "texte en gras"],
  italique:["*", "*", "texte en italique"],
  titre:["\n\n## ", "\n\n", "Mon intertitre"],
  citation:["\n\n> ", "\n> — Auteur\n\n", "Une parole mémorable"],
  liste:["\n\n- ", "\n- \n\n", "premier point"],
  image:["\n\n![", "](https://adresse-de-l-image)\n\n", "Légende de l’illustration"],
  sep:["\n\n---\n\n", "", ""]
};
document.querySelector(".ch-outils").addEventListener("click", e => {
  const k = e.target.closest("button")?.dataset.ins;
  if(!k) return;
  montrerApercu(false);
  const t = $("#ch-contenu"), [avant, apres, defaut] = INSERTIONS[k];
  const sel = t.value.slice(t.selectionStart, t.selectionEnd) || defaut;
  t.setRangeText(avant + sel + apres, t.selectionStart, t.selectionEnd, "end");
  t.focus();
});

$("#f-chro").addEventListener("submit", async e => {
  e.preventDefault();
  const bouton = e.target.querySelector("button[type=submit]"), retour = $("#ch-retour"), pid = $("#ch-id").value;
  const chronique = { titre:$("#ch-titre").value.trim(), extrait:$("#ch-extrait").value.trim(), image:$("#ch-image").value.trim(),
    contenu:$("#ch-contenu").value, publie:$("#ch-statut").value === "1" };
  bouton.disabled = true;
  const r = await appel("chroniques", pid ? { action:"modifier", id:pid, chronique } : { action:"creer", chronique });
  bouton.disabled = false;
  if(!r.ok){
    retour.innerHTML = erreurHtml(r);
    if(r.statut === 401 || r.statut === 403) majSession();
    return;
  }
  dChro.close();
  const cible = "#chronique-" + r.id;
  if(location.hash === cible) route(); else location.hash = cible;
});
