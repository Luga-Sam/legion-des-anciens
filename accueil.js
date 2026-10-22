/* accueil.js : recrutement, progression, formulaire « Postuler » et section Twitch */
const modal = $("#modal");

/* Recrutement */
let filtre = "tous";
const filtres = [["tous","Toutes les classes"],["prio","Recherche prioritaire"],["ouvert","Ouvert"],["ferme","Fermé"]];
const barre = $("#filtres");
filtres.forEach(([cle, texte]) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = texte;
  b.setAttribute("aria-pressed", cle === filtre);
  b.onclick = () => {
    filtre = cle;
    barre.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    dessiner();
  };
  barre.append(b);
});

function dessiner(){
  const g = $("#grille");
  g.innerHTML = "";
  CLASSES.forEach(c => {
    const st = statutClasse(c.nom), e = etat.recrutement[c.nom];
    if(filtre !== "tous" && st !== filtre) return;
    const el = document.createElement("article");
    el.className = "carte" + (st === "prio" ? " is-prio" : "");
    el.dataset.s = st;
    el.style.setProperty("--cl", c.couleur);
    const cls = { ouvert:"s-ouvert", ferme:"s-ferme", prio:"s-prio" }[st];
    el.innerHTML = `<h3>${esc(c.nom)}</h3><span class="statut ${cls}">${LIBELLES[st]}</span><small>${esc(e.note)}</small>
      <ul class="specs">${c.specs.map(sp => `<li class="sp-${e.specs[sp]}"><span>${esc(sp)}</span><em>${LIBELLES[e.specs[sp]]}</em></li>`).join("")}</ul>
      <a href="#" class="btn btn-ligne">Postuler</a>`;
    el.querySelector(".btn").onclick = ev => { ev.preventDefault(); ouvrir(c.nom); };
    g.append(el);
  });
  if(!g.children.length) g.innerHTML = '<p class="intro">Aucune classe dans cette catégorie pour le moment.</p>';
}

/* Progression */
function dessinerRaids(){
  $("#raids").innerHTML = etat.raids.map(r => {
    const pct = r.total ? Math.round(r.tues / r.total * 100) : 0;
    return `<article class="raid${r.tues === r.total ? " fini" : ""}">
      <h3>${esc(r.nom)}</h3>
      <div class="score">${+r.tues}/${+r.total} <span>${r.mention ? esc(r.mention) + " · " : ""}boss vaincus</span></div>
      <div class="barre" role="img" aria-label="${pct} % de progression"><i style="width:${pct}%"></i></div>
      <p>${esc(r.note)}</p></article>`;
  }).join("") || '<p class="intro">La progression sera bientôt affichée.</p>';
}

function toutDessiner(){ dessiner(); dessinerRaids(); }
toutDessiner();
document.addEventListener("legion:site", toutDessiner);

/* Formulaire */
const selClasse = $("#classe"), selSpe = $("#spe");
CLASSES.forEach(c => selClasse.add(new Option(c.nom, c.nom)));
selClasse.onchange = () => {
  const c = CLASSES.find(x => x.nom === selClasse.value);
  selSpe.length = 1;
  selSpe.disabled = !c;
  selSpe.options[0].text = c ? "Choisir une spécialisation" : "Choisissez d’abord une classe";
  if(c) c.specs.forEach(s => selSpe.add(new Option(s, s)));
};

function ouvrir(classe){
  $("#retour").innerHTML = "";
  if(classe){ selClasse.value = classe; selClasse.onchange(); }
  modal.showModal();
}
$("#fermer").onclick = () => modal.close();
modal.addEventListener("click", e => { if(e.target === modal) modal.close(); });

$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, retour = $("#retour"), bouton = f.querySelector("button[type=submit]");
  if(!f.reportValidity()) return;
  const lienDiscord = `<a href="${LIEN_DISCORD}" target="_blank" rel="noopener">notre Discord</a>`;
  bouton.disabled = true; bouton.textContent = "Envoi en cours…";
  let detail = "Serveur injoignable";
  try{
    const r = await fetch("/api/candidature", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(Object.fromEntries(new FormData(f)))
    });
    if(!r.ok){
      let m = ""; try{ m = (await r.json()).erreur || ""; }catch{}
      detail = "Code " + r.status + (m ? " : " + m : "");
      throw new Error();
    }
    f.reset(); selClasse.onchange();
    retour.innerHTML = `<div class="msg">Votre candidature a bien été transmise à l’équipe ! Rendez-vous sur ${lienDiscord}.</div>`;
  }catch{
    retour.innerHTML = `<div class="msg err">L’envoi a échoué. Pas de panique : rejoignez directement ${lienDiscord} et présentez-vous à l’équipe de recrutement.<br><small>Détail technique (pour les officiers) : ${esc(detail)}</small></div>`;
  }
  bouton.disabled = false; bouton.textContent = "Envoyer ma candidature";
});

// Arrivée depuis un autre onglet du menu (« Postuler ») : on ouvre directement le formulaire
if(/[?&]postuler\b/.test(location.search)) ouvrir();

/* Twitch : lecteur et tchat de la section « Le Live de la Guilde » */
function demarrerTwitch(){
  // « parent » doit être l'adresse de votre site : Twitch refuse la lecture sinon
  const embed = new Twitch.Embed("tw-embed", {
    width:"100%", height:"100%", channel:TWITCH_CHANNEL_NAME, theme:"dark",
    layout: TWITCH_CHAT && innerWidth >= 900 ? "video-with-chat" : "video",
    autoplay:false, parent:[location.hostname]
  });
  embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
    const p = embed.getPlayer();
    p.addEventListener(Twitch.Player.ONLINE, () => { if(!sourceApi) etatLive(true); });
    p.addEventListener(Twitch.Player.OFFLINE, () => { if(!sourceApi) etatLive(false); });
    // évite d'avoir l'hymne et le stream en même temps
    p.addEventListener(Twitch.Player.PLAYING, () => { if(!hymne.paused){ hymne.pause(); arretVolontaire = true; } });
  });
}
if(TWITCH_OK){
  $("#tw-chaine").href = TWITCH_URL;
  $("#tw-abo").href = "https://www.twitch.tv/subs/" + TWITCH_CHANNEL_NAME;
  $("#live").hidden = false;
  const sc = document.createElement("script");
  sc.src = "https://embed.twitch.tv/embed/v1.js";
  sc.onload = demarrerTwitch;
  document.head.append(sc);
}
