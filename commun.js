/* =====================================================================
   commun.js : Géré par Cloudflare (remplace Supabase)
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PAGE = document.body.dataset.page || "accueil";
const LIBELLES = { ouvert:"Ouvert", ferme:"Fermé", prio:"Recherche prioritaire" };
const TWITCH_OK = /^[A-Za-z0-9_]{3,25}$/.test(TWITCH_CHANNEL_NAME) && TWITCH_CHANNEL_NAME !== "ton_pseudo_twitch";
const TWITCH_URL = "https://www.twitch.tv/" + TWITCH_CHANNEL_NAME;

function signaler(nom){ document.dispatchEvent(new CustomEvent("legion:" + nom)); }

/* ---------- Mise en page commune ---------- */
const ICONE_TWITCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.43l-3 3v-3H6.857V1.714h13.714Z"/></svg>';
const ICONE_USER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>';
const PIED = `<footer>
  <div class="wrap">
    <span>© 2026 La Légion des Anciens. Guilde indépendante, non affiliée à Blizzard Entertainment.</span>
    <a class="js-discord" href="#" target="_blank" rel="noopener">Discord de la guilde</a>
    <button type="button" class="l-officier" id="ouvrir-admin">Espace Officier</button>
  </div>
</footer>`;
const LECTEUR = `<audio id="hymne" loop preload="auto" playsinline></audio>
<div class="lecteur" id="lecteur" role="region" aria-label="Hymne de la Guilde">
  <button class="l-play" id="l-play" type="button" aria-label="Lancer l’hymne">
    <svg class="i-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4z"/></svg>
    <span class="ondes" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  </button>
  <div class="l-txt"><b>Hymne de la Guilde</b><span id="l-etat" aria-live="polite">Activer le son</span></div>
  <button class="l-mute" id="l-mute" type="button" aria-label="Couper ou activer le son">
    <svg class="i-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>
    <svg class="i-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4z"/></svg>
  </button>
  <input id="l-vol" type="range" min="0" max="1" step="0.05" value="0.4" aria-label="Volume de l’hymne">
</div>`;

const MODALES = `<dialog id="dlg-auth" aria-labelledby="auth-titre">
  <button class="fermer" type="button" aria-label="Fermer" id="auth-fermer">&times;</button>
  <h2 id="auth-titre">Espace membres</h2>
  <div class="onglets" id="auth-onglets" role="group" aria-label="Connexion ou création de compte" style="margin-top:1rem">
    <button type="button" data-m="connexion" aria-pressed="true">Connexion</button>
    <button type="button" data-m="inscription" aria-pressed="false">Créer un compte</button>
  </div>
  <form id="f-auth">
    <div id="auth-pseudo-bloc" hidden>
      <label for="au-pseudo">Pseudo affiché sur le site
        <input id="au-pseudo" maxlength="24" minlength="2" autocomplete="nickname"></label>
    </div>
    <div id="auth-email-bloc">
      <label for="au-email">Adresse e-mail
        <input id="au-email" type="email" required autocomplete="email"></label>
    </div>
    <label for="au-mdp"><span id="au-mdp-lib">Mot de passe</span>
      <input id="au-mdp" type="password" required minlength="8" autocomplete="current-password"></label>
    <button class="btn btn-or" type="submit" id="au-envoi">Se connecter</button>
    <div id="auth-retour" role="status"></div>
  </form>
</dialog>`;

function injecterMiseEnPage(){
  const lien = (href, texte, page) => `<a href="${href}"${PAGE === page ? ' aria-current="page"' : ""}>${texte}</a>`;
  document.body.insertAdjacentHTML("afterbegin", `
<header id="entete">
  <div class="wrap">
    <a class="logo" href="${PAGE === "accueil" ? "#haut" : "index.html"}">La Légion<span class="l2"> des Anciens</span></a>
    <nav id="menu" aria-label="Navigation principale">
      ${lien("index.html#presentation", "Qui sommes-nous ?", "")}
      ${lien("index.html#recrutement", "Recrutement", "")}
      ${lien("calendrier.html", "Calendrier", "calendrier")}
      ${lien("roster.html", "Roster", "roster")}
      ${TWITCH_OK ? lien("index.html#live", "Live", "") : ""}
      <a href="index.html?postuler" class="js-postuler">Postuler</a>
    </nav>
    <div class="droite">
      <a class="tw" id="tw-badge" href="#" target="_blank" rel="noopener" hidden aria-label="Chaîne Twitch">${ICONE_TWITCH}<i class="pt" aria-hidden="true"></i><span id="tw-txt">Twitch</span></a>
      <div class="compte" id="compte">
        <button type="button" class="btn-compte" id="btn-connexion"><span class="long">Connexion / S’inscrire</span><span class="court">Connexion</span></button>
        <a class="btn-compte" id="btn-profil" href="roster.html#mon-personnage" hidden>${ICONE_USER}<span id="compte-pseudo"></span></a>
        <button type="button" class="btn-compte discret" id="btn-deconnexion" hidden>Déconnexion</button>
      </div>
      <button type="button" class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>
<div class="annonce" id="annonce" hidden><div class="wrap"><strong>Annonce</strong><span id="annonce-txt"></span></div></div>`);
  document.body.insertAdjacentHTML("beforeend", PIED + LECTEUR + MODALES);
}
injecterMiseEnPage();

const entete = $("#entete"), burger = $("#burger");
burger.onclick = () => { const ouvert = entete.classList.toggle("ouvert"); burger.setAttribute("aria-expanded", String(ouvert)); };
document.querySelectorAll("#menu a").forEach(a => a.addEventListener("click", () => { entete.classList.remove("ouvert"); burger.setAttribute("aria-expanded", "false"); }));
document.querySelectorAll(".js-discord").forEach(a => a.href = LIEN_DISCORD);

/* Gestion État & Site */
let etat = { annonce:"", recrutement:{}, raids:[] };
function appliquer(d){
  etat.annonce = typeof d?.annonce === "string" ? d.annonce : "";
  CLASSES.forEach(c => {
    const x = d?.recrutement?.[c.nom];
    etat.recrutement[c.nom] = {
      note: typeof x?.note === "string" ? x.note : c.note,
      specs: Object.fromEntries(c.specs.map(sp => [sp, LIBELLES[x?.specs?.[sp]] ? x.specs[sp] : c.statut]))
    };
  });
  etat.raids = Array.isArray(d?.raids) ? d.raids : RAIDS.map(r => ({ mention:"", ...r }));
}
appliquer({});
function statutClasse(nom){
  const v = Object.values(etat.recrutement[nom].specs);
  return v.includes("prio") ? "prio" : v.includes("ouvert") ? "ouvert" : "ferme";
}

function dessinerAnnonce(){
  $("#annonce").hidden = !etat.annonce.trim();
  $("#annonce-txt").textContent = etat.annonce;
}
dessinerAnnonce();
fetch("/api/data", { cache:"no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { if(d && Object.keys(d).length){ appliquer(d); signaler("site"); } })
  .catch(() => {});

/* Gestion Sessions Cloudflare */
let session = null, profil = null, mesPersos = [];
const acces = () => (session && profil) ? profil.role : "visiteur";
const estMembre = () => acces() === "membre" || acces() === "officier";
const estOfficier = () => acces() === "officier";

// Charger la session stockée localement dans le navigateur si elle existe
try {
  const mem = JSON.parse(localStorage.getItem("legion_session") || "null");
  if(mem) { session = mem.session; profil = mem.profil; }
} catch {}

function majInterface(){
  const connecte = !!(session && profil);
  $("#btn-connexion").hidden = connecte;
  $("#btn-profil").hidden = !connecte;
  $("#btn-deconnexion").hidden = !connecte;
  if(connecte) { $("#compte-pseudo").textContent = profil.pseudo; }
  signaler("session");
}
majInterface();

/* Fenêtre d'authentification */
const dAuth = $("#dlg-auth");
let modeAuth = "connexion";
function modeAuthSet(m){
  modeAuth = m;
  const ins = m === "inscription";
  $("#auth-retour").innerHTML = "";
  document.querySelectorAll("#auth-onglets button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
  $("#auth-pseudo-bloc").hidden = !ins;
  $("#au-pseudo").required = ins;
  $("#au-mdp-lib").textContent = "Mot de passe";
  $("#au-envoi").textContent = ins ? "Créer mon compte" : "Se connecter";
  $("#auth-titre").textContent = ins ? "Créer un compte" : "Espace membres";
}
function ouvrirAuth(m = "connexion"){
  modeAuthSet(m);
  if(!dAuth.open) dAuth.showModal();
}
$("#auth-onglets").addEventListener("click", e => { if(e.target.dataset.m) modeAuthSet(e.target.dataset.m); });
$("#auth-fermer").onclick = () => dAuth.close();
dAuth.addEventListener("click", e => { if(e.target === dAuth) dAuth.close(); });
$("#btn-connexion").onclick = () => ouvrirAuth("connexion");
$("#btn-deconnexion").onclick = () => { 
  localStorage.removeItem("legion_session");
  session = null; profil = null;
  majInterface();
  location.reload();
};

$("#f-auth").addEventListener("submit", async e => {
  e.preventDefault();
  const retour = $("#auth-retour"), bouton = $("#au-envoi");
  const email = $("#au-email").value.trim();
  const password = $("#au-mdp").value;
  const pseudo = $("#au-pseudo").value.trim();

  bouton.disabled = true; retour.innerHTML = "";
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: modeAuth, email, password, pseudo })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.erreur || "Erreur de connexion");

    if(modeAuth === "inscription") {
      retour.innerHTML = `<div class="msg">${esc(data.message)}</div>`;
    } else {
      session = data.session;
      profil = data.profil;
      localStorage.setItem("legion_session", JSON.stringify({ session, profil }));
      dAuth.close();
      majInterface();
      location.reload();
    }
  } catch(err) {
    retour.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
  bouton.disabled = false;
});

/* Lecteur de l'hymne & Twitch (gardés à l'identique) */
const hymne = $("#hymne"), lec = $("#lecteur"), etatLec = $("#l-etat"), vol = $("#l-vol");
let cible = VOLUME_DEPART;
hymne.volume = 0; hymne.src = FICHIER_HYMNE; vol.value = cible;
