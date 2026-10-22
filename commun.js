/* =====================================================================
   commun.js : Code complet et partagé (Menu, Comptes D1, Armurerie, Officier)
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PAGE = document.body.dataset.page || "accueil";
const LIBELLES = { ouvert:"Ouvert", ferme:"Fermé", prio:"Recherche prioritaire" };
const SB_OK = true;
const TWITCH_OK = typeof TWITCH_CHANNEL_NAME !== "undefined" && /^[A-Za-z0-9_]{3,25}$/.test(TWITCH_CHANNEL_NAME) && TWITCH_CHANNEL_NAME !== "ton_pseudo_twitch";
const TWITCH_URL = "https://www.twitch.tv/" + (typeof TWITCH_CHANNEL_NAME !== "undefined" ? TWITCH_CHANNEL_NAME : "");

function signaler(nom){ document.dispatchEvent(new CustomEvent("legion:" + nom)); }

/* ---------- Mise en page commune ---------- */
const ICONE_TWITCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.43l-3 3v-3H6.857V1.714h13.714Z"/></svg>';
const ICONE_USER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>';
const PIED = `<footer><div class="wrap"><span>© 2026 La Légion des Anciens.</span><a class="js-discord" href="#" target="_blank" rel="noopener">Discord</a><button type="button" class="l-officier" id="ouvrir-admin">Espace Officier</button></div></footer>`;
const LECTEUR = `<audio id="hymne" loop preload="auto" playsinline></audio><div class="lecteur" id="lecteur"><button class="l-play" id="l-play" type="button"><span class="ondes" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button><div class="l-txt"><b>Hymne</b><span id="l-etat">Activer le son</span></div><button class="l-mute" id="l-mute" type="button"></button><input id="l-vol" type="range" min="0" max="1" step="0.05" value="0.4"></div>`;

const MODALES = `<dialog id="dlg-auth" aria-labelledby="auth-titre">
  <button class="fermer" type="button" id="auth-fermer">&times;</button>
  <h2 id="auth-titre">Espace membres</h2>
  <div class="onglets" id="auth-onglets" role="group"><button type="button" data-m="connexion" aria-pressed="true">Connexion</button><button type="button" data-m="inscription" aria-pressed="false">Créer un compte</button></div>
  <form id="f-auth">
    <div id="auth-pseudo-bloc" hidden><label for="au-pseudo">Pseudo<input id="au-pseudo" maxlength="24" minlength="2"></label></div>
    <div id="auth-email-bloc"><label for="au-email">E-mail<input id="au-email" type="email" required></label></div>
    <label for="au-mdp"><span id="au-mdp-lib">Mot de passe</span><input id="au-mdp" type="password" required minlength="8"></label>
    <button class="btn btn-or" type="submit" id="au-envoi">Se connecter</button>
    <div id="auth-retour" role="status"></div>
  </form>
</dialog>

<dialog id="dlg-perso" aria-labelledby="perso-titre">
  <button class="fermer" type="button" id="perso-fermer">&times;</button>
  <h2 id="perso-titre">Nouveau personnage</h2>
  <form id="f-perso">
    <input type="hidden" id="p-id">
    <label for="p-nom">Nom<input id="p-nom" required minlength="2" maxlength="24"></label>
    <label for="p-classe">Classe<select id="p-classe" required><option value="">Choisir une classe</option></select></label>
    <label for="p-spe">Spécialisation<select id="p-spe" required disabled><option value="">Choisissez une classe</option></select></label>
    <label for="p-role">Rôle<select id="p-role" required><option value="dps">DPS</option><option value="tank">Tank</option><option value="soigneur">Soigneur</option></select></label>
    <label for="p-niveau">Niveau<input id="p-niveau" type="number" min="1" max="90" required></label>
    <label for="p-m1">Métier 1<select id="p-m1"><option value="">Aucun</option></select></label>
    <label for="p-m2">Métier 2<select id="p-m2"><option value="">Aucun</option></select></label>
    <button class="btn btn-or" type="submit">Enregistrer</button>
    <div id="perso-retour" role="status"></div>
  </form>
</dialog>

<dialog id="admin" class="large" aria-labelledby="admin-titre">
  <button class="fermer" type="button" id="admin-fermer">&times;</button>
  <h2 id="admin-titre">Espace Officier</h2>
  <div class="onglets onglets-admin" role="group">
    <button type="button" data-p="site" aria-pressed="true">Site</button>
    <button type="button" data-p="raids" aria-pressed="false">Raids</button>
    <button type="button" data-p="membres" aria-pressed="false">Membres<span id="compteur-membres"></span></button>
  </div>
  <div id="panneau-site">
    <form id="login">
      <label for="code">Code d’accès<input id="code" type="password" required></label>
      <button class="btn btn-or" type="submit">Se connecter</button>
      <div id="login-retour" role="status"></div>
    </form>
    <div id="tableau" hidden>
      <button class="btn btn-ligne petit" type="button" id="deconnexion">Verrouiller</button>
      <h3>Annonce</h3><textarea id="a-annonce" maxlength="300"></textarea>
      <h3>Recrutement</h3><div id="a-rec"></div>
      <h3>Raids</h3><div id="a-raids"></div>
      <button class="btn btn-ligne petit" type="button" id="a-ajout">+ Ajouter</button>
      <button class="btn btn-or" type="button" id="a-sauver">Sauvegarder</button>
      <div id="a-retour" role="status"></div>
    </div>
  </div>
  <div id="panneau-raids" hidden>
    <div id="raids-gate" class="verrou"><p>Réservé aux officiers connectés.</p><button type="button" class="btn btn-or js-ouvrir-auth">Se connecter</button></div>
    <div id="raids-contenu" hidden>
      <h3>Créer un raid</h3>
      <form id="f-raid">
        <label>Titre<input id="c-titre" required maxlength="60"></label>
        <label>Date<input id="c-date" type="date" required></label>
        <label>Rassemblement<input id="c-rass" type="time" value="20:30" required></label>
        <label>Début<input id="c-debut" type="time" value="20:45" required></label>
        <label>Tanks<input id="c-tank" type="number" min="0" value="2"></label>
        <label>Soigneurs<input id="c-heal" type="number" min="0" value="4"></label>
        <label>DPS<input id="c-dps" type="number" min="0" value="4"></label>
        <button class="btn btn-or" type="submit">Créer le raid</button>
      </form>
      <div id="c-retour" role="status"></div>
    </div>
  </div>
  <div id="panneau-membres" hidden>
    <div id="membres-gate" class="verrou"><p>Réservé aux officiers.</p></div>
    <div id="membres-contenu" hidden><h3>Membres</h3><div id="a-membres" class="a-ins"></div><div id="m-retour" role="status"></div></div>
  </div>
</dialog>`;

function injecterMiseEnPage(){
  const lien = (href, texte, page) => `<a href="${href}"${PAGE === page ? ' aria-current="page"' : ""}>${texte}</a>`;
  document.body.insertAdjacentHTML("afterbegin", `<header id="entete"><div class="wrap"><a class="logo" href="index.html">La Légion</a><nav id="menu">${lien("index.html#presentation", "Qui sommes-nous ?", "")}${lien("calendrier.html", "Calendrier", "calendrier")}${lien("roster.html", "Roster", "roster")}<a href="index.html?postuler" class="js-postuler">Postuler</a></nav><div class="droite"><a class="tw" id="tw-badge" href="#" hidden>${ICONE_TWITCH}<span id="tw-txt">Twitch</span></a><div class="compte" id="compte"><button type="button" class="btn-compte" id="btn-connexion">Connexion</button><a class="btn-compte" id="btn-profil" href="roster.html#mon-personnage" hidden>${ICONE_USER}<span id="compte-pseudo"></span></a><button type="button" class="btn-compte discret" id="btn-deconnexion" hidden>Déconnexion</button></div></div></div></header><div class="annonce" id="annonce" hidden><div class="wrap"><strong>Annonce</strong><span id="annonce-txt"></span></div></div>`);
  document.body.insertAdjacentHTML("beforeend", PIED + LECTEUR + MODALES);
}
injecterMiseEnPage();

const entete = $("#entete"), burger = $("#burger");
if(burger) burger.onclick = () => entete.classList.toggle("ouvert");

/* Session et état */
let session = null, profil = null;
try {
  const stock = JSON.parse(localStorage.getItem("legion_session") || "null");
  if(stock) { session = stock.session; profil = stock.profil; }
} catch {}

const acces = () => (profil ? profil.role : "visiteur");
const estMembre = () => acces() === "membre" || acces() === "officier";
const estOfficier = () => acces() === "officier";

function majInterface(){
  const connecte = !!(session && profil);
  if($("#btn-connexion")) $("#btn-connexion").hidden = connecte;
  if($("#btn-profil")) $("#btn-profil").hidden = !connecte;
  if($("#btn-deconnexion")) $("#btn-deconnexion").hidden = !connecte;
  if(connecte && $("#compte-pseudo")) $("#compte-pseudo").textContent = profil.pseudo;
  if(typeof majAdminAcces === "function") majAdminAcces();
}
document.addEventListener("DOMContentLoaded", majInterface);
setTimeout(majInterface, 50);

// Authentification & Modales
const dAuth = $("#dlg-auth");
let modeAuth = "connexion";
function modeAuthSet(m){
  modeAuth = m;
  const ins = m === "inscription";
  if($("#auth-retour")) $("#auth-retour").innerHTML = "";
  document.querySelectorAll("#auth-onglets button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
  if($("#auth-pseudo-bloc")) $("#auth-pseudo-bloc").hidden = !ins;
  if($("#au-pseudo")) $("#au-pseudo").required = ins;
  if($("#au-envoi")) $("#au-envoi").textContent = ins ? "Créer mon compte" : "Se connecter";
}
function ouvrirAuth(m = "connexion"){
  modeAuthSet(m);
  if(dAuth && !dAuth.open) dAuth.showModal();
}
if($("#auth-onglets")) $("#auth-onglets").addEventListener("click", e => { if(e.target.dataset.m) modeAuthSet(e.target.dataset.m); });
if($("#auth-fermer")) $("#auth-fermer").onclick = () => dAuth.close();
if($("#btn-connexion")) $("#btn-connexion").onclick = () => ouvrirAuth("connexion");
if($("#btn-deconnexion")) $("#btn-deconnexion").onclick = () => {
  localStorage.removeItem("legion_session");
  session = null; profil = null; majInterface(); location.reload();
};

document.addEventListener("submit", async e => {
  if (e.target && e.target.id === "f-auth") {
    e.preventDefault();
    const retour = $("#auth-retour"), bouton = $("#au-envoi");
    const email = $("#au-email").value.trim(), password = $("#au-mdp").value, pseudo = $("#au-pseudo") ? $("#au-pseudo").value.trim() : "";
    if(bouton) bouton.disabled = true;
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: modeAuth, email, password, pseudo }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erreur || "Erreur");
      if (modeAuth === "inscription") {
        if(retour) retour.innerHTML = `<div class="msg">${esc(d.message)}</div>`;
      } else {
        session = d.session; profil = d.profil;
        localStorage.setItem("legion_session", JSON.stringify({ session, profil }));
        if(dAuth) dAuth.close();
        majInterface(); location.reload();
      }
    } catch(err) {
      if(retour) retour.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    } finally {
      if(bouton) bouton.disabled = false;
    }
  }
});

/* ---------- Armurerie : Personnages ---------- */
const dPerso = $("#dlg-perso"), pClasse = $("#p-classe"), pSpe = $("#p-spe");
if(pClasse && typeof CLASSES !== "undefined") CLASSES.forEach(c => pClasse.add(new Option(c.nom, c.nom)));
if(typeof METIERS !== "undefined") {
  [$("#p-m1"), $("#p-m2")].forEach(s => { if(s) METIERS.forEach(m => s.add(new Option(m, m))); });
}
if(pClasse) {
  pClasse.onchange = () => {
    if(typeof CLASSES === "undefined") return;
    const c = CLASSES.find(x => x.nom === pClasse.value);
    pSpe.length = 1; pSpe.disabled = !c;
    pSpe.options[0].text = c ? "Choisir une spécialisation" : "Choisissez une classe";
    if(c) c.specs.forEach(sp => pSpe.add(new Option(sp, sp)));
  };
}
function ouvrirPerso(p){
  if(!dPerso) return;
  if($("#perso-retour")) $("#perso-retour").innerHTML = "";
  if($("#perso-titre")) $("#perso-titre").textContent = p ? "Modifier" : "Nouveau personnage";
  if($("#p-id")) $("#p-id").value = p ? p.id : "";
  if($("#p-nom")) $("#p-nom").value = p ? p.nom : "";
  if(pClasse) { pClasse.value = p ? p.classe : ""; pClasse.onchange(); }
  if(pSpe) pSpe.value = p ? p.specialisation : "";
  if($("#p-role")) $("#p-role").value = p ? p.role : "dps";
  if($("#p-niveau")) $("#p-niveau").value = p ? p.niveau : "";
  if(!dPerso.open) dPerso.showModal();
}
if($("#perso-fermer")) $("#perso-fermer").onclick = () => dPerso.close();

// Enregistrement Personnage
if($("#f-perso")) {
  $("#f-perso").addEventListener("submit", async e => {
    e.preventDefault();
    const v = id => $("#" + id).value.trim();
    const personnage = { id: v("p-id") || undefined, nom: v("p-nom"), classe: v("p-classe"), specialisation: v("p-spe"), role: v("p-role"), niveau: parseInt(v("p-niveau"), 10) || 1, metier1: v("p-m1") || null, metier2: v("p-m2") || null };
    try {
      const res = await fetch("/api/admin-membres", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sauvegarder_personnage", personnage, userId: session?.user?.id }) });
      const d = await res.json();
      if(!res.ok) throw new Error(d.erreur || "Erreur");
      if(dPerso) dPerso.close();
      location.reload();
    } catch(err) {
      if($("#perso-retour")) $("#perso-retour").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    }
  });
}

/* ---------- Espace Officier & Raids ---------- */
const adm = $("#admin"), login = $("#login"), tableau = $("#tableau");
let codeOfficier = "";
try{ codeOfficier = sessionStorage.getItem("legion_code") || ""; }catch{}

async function api(corps){
  const r = await fetch("/api/data", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(corps) });
  let d = {}; try{ d = await r.json(); }catch{}
  return { ok:r.ok, statut:r.status, erreur:d.erreur, data:d.data };
}

function afficherAdmin(connecte){
  if(login) login.hidden = connecte;
  if(tableau) tableau.hidden = !connecte;
}
if($("#ouvrir-admin")) $("#ouvrir-admin").onclick = () => { if(adm) { afficherAdmin(!!codeOfficier); adm.showModal(); } };
if($("#admin-fermer")) $("#admin-fermer").onclick = () => adm.close();

if(login) {
  login.addEventListener("submit", async e => {
    e.preventDefault();
    const r = await api({ code: $("#code").value, verifier:true });
    if(r.ok){ codeOfficier = $("#code").value; sessionStorage.setItem("legion_code", codeOfficier); afficherAdmin(true); }
    else { $("#login-retour").innerHTML = '<div class="msg err">Code incorrect</div>'; }
  });
}

// Création de Raid
if($("#f-raid")) {
  $("#f-raid").addEventListener("submit", async e => {
    e.preventDefault();
    const raid = { titre: $("#c-titre").value.trim(), date: $("#c-date").value, debut: $("#c-debut").value, rassemblement: $("#c-rass").value, tank: +$("#c-tank").value, soigneur: +$("#c-heal").value, dps: +$("#c-dps").value };
    try {
      const res = await fetch("/api/admin-membres", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "creer_raid", raid, userId: session?.user?.id }) });
      const d = await res.json();
      if(!res.ok) throw new Error(d.erreur || "Erreur");
      if($("#c-retour")) $("#c-retour").innerHTML = '<div class="msg">Raid créé !</div>';
      e.target.reset();
    } catch(err) {
      if($("#c-retour")) $("#c-retour").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    }
  });
}

// Gestion des onglets de l'officier
document.querySelectorAll(".onglets-admin button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".onglets-admin button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === b.dataset.p));
  ["site", "raids", "membres"].forEach(p => { if($("#panneau-" + p)) $("#panneau-" + p).hidden = p !== b.dataset.p; });
  if(b.dataset.p === "membres" && estOfficier()) chargerMembres();
});

function majAdminAcces(){
  const off = estOfficier();
  ["raids", "membres"].forEach(k => { if($("#" + k + "-gate")) $("#" + k + "-gate").hidden = off; if($("#" + k + "-contenu")) $("#" + k + "-contenu").hidden = !off; });
}
document.querySelectorAll(".js-ouvrir-auth").forEach(b => b.onclick = () => ouvrirAuth("connexion"));

async function chargerMembres(){
  try {
    const res = await fetch("/api/admin-membres", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lister", userId: session?.user?.id }) });
    const d = await res.json();
    if(res.ok && $("#a-membres")) {
      $("#a-membres").innerHTML = (d.membres || []).map(m => `<div class="a-ligne"><b>${esc(m.pseudo)}</b><select data-membre="${m.id}"><option value="en_attente"${m.role==="en_attente"?" selected":""}>En attente</option><option value="membre"${m.role==="membre"?" selected":""}>Membre</option><option value="officier"${m.role==="officier"?" selected":""}>Officier</option><option value="refuse"${m.role==="refuse"?" selected":""}>Refusé</option></select></div>`).join("");
    }
  } catch {}
}

if($("#a-membres")) {
  $("#a-membres").addEventListener("change", async e => {
    const targetId = e.target.dataset.membre, nouveauRole = e.target.value;
    if(targetId) await fetch("/api/admin-membres", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "modifier_role", targetId, nouveauRole, userId: session?.user?.id }) });
  });
}

// Twitch
async function sonderTwitch(){
  try{
    const r = await fetch("/api/twitch?channel=" + encodeURIComponent(TWITCH_CHANNEL_NAME));
    const d = r.ok ? await r.json() : null;
    if(d && typeof d.live === "boolean"){
      const b = $("#tw-badge");
      if(b) { b.classList.toggle("live", d.live); b.hidden = false; b.href = TWITCH_URL; }
      if($("#tw-txt")) $("#tw-txt").textContent = d.live ? "EN LIVE" : "Twitch";
    }
  }catch{}
}
if(TWITCH_OK){ sonderTwitch(); setInterval(sonderTwitch, 60000); }
