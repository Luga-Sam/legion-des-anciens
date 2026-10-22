/* =====================================================================
   commun.js : ce qui est partagé par TOUTES les pages (menu, pied de page, hymne, comptes,
   Espace Officier).
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PAGE = document.body.dataset.page || "accueil";
const LIBELLES = { ouvert:"Ouvert", ferme:"Fermé", prio:"Recherche prioritaire" };
const SB_OK = true; // Activé pour Cloudflare D1
const TWITCH_OK = /^[A-Za-z0-9_]{3,25}$/.test(TWITCH_CHANNEL_NAME) && TWITCH_CHANNEL_NAME !== "ton_pseudo_twitch";
const TWITCH_URL = "https://www.twitch.tv/" + TWITCH_CHANNEL_NAME;

function signaler(nom){ document.dispatchEvent(new CustomEvent("legion:" + nom)); }

/* ---------- Mise en page commune : menu, annonce, pied de page, lecteur, modales ---------- */
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
  <p class="intro" id="auth-indispo" hidden style="margin-top:1rem">Les comptes membres ne sont pas activés.</p>
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
    <button type="button" class="lien-bouton" id="au-oubli">Mot de passe oublié ?</button>
    <p class="intro petite" id="au-aide" style="margin:.8rem 0 0"></p>
    <div id="auth-retour" role="status"></div>
  </form>
</dialog>

<dialog id="dlg-perso" aria-labelledby="perso-titre">
  <button class="fermer" type="button" aria-label="Fermer" id="perso-fermer">&times;</button>
  <h2 id="perso-titre">Nouveau personnage</h2>
  <form id="f-perso">
    <input type="hidden" id="p-id">
    <label for="p-nom">Nom du personnage
      <input id="p-nom" required minlength="2" maxlength="24" autocomplete="off"></label>
    <label for="p-classe">Classe
      <select id="p-classe" required><option value="">Choisir une classe</option></select></label>
    <label for="p-spe">Spécialisation principale
      <select id="p-spe" required disabled><option value="">Choisissez d’abord une classe</option></select></label>
    <label for="p-role">Rôle principal
      <select id="p-role" required>
        <option value="dps">DPS (épée)</option>
        <option value="tank">Tank (bouclier)</option>
        <option value="soigneur">Soigneur (croix)</option>
      </select></label>
    <label for="p-niveau">Niveau
      <input id="p-niveau" type="number" min="1" max="90" required></label>
    <label for="p-m1">Premier métier (facultatif)
      <select id="p-m1"><option value="">Aucun</option></select></label>
    <label for="p-m2">Second métier (facultatif)
      <select id="p-m2"><option value="">Aucun</option></select></label>
    <button class="btn btn-or" type="submit">Enregistrer</button>
    <div id="perso-retour" role="status"></div>
  </form>
</dialog>

<dialog id="dlg-fiche" aria-label="Fiche du personnage">
  <button class="fermer" type="button" aria-label="Fermer" id="fiche-fermer">&times;</button>
  <h2>Armurerie</h2>
  <div id="fiche-carte"></div>
</dialog>

<dialog id="admin" class="large" aria-labelledby="admin-titre">
  <button class="fermer" type="button" aria-label="Fermer" id="admin-fermer">&times;</button>
  <h2 id="admin-titre">Espace Officier</h2>
  <div class="onglets onglets-admin" role="group" aria-label="Sections de l’Espace Officier">
    <button type="button" data-p="site" aria-pressed="true">Annonce, recrutement, progression</button>
    <button type="button" data-p="raids" aria-pressed="false">Calendrier &amp; roster</button>
    <button type="button" data-p="membres" aria-pressed="false">Membres<span id="compteur-membres"></span></button>
  </div>

  <div id="panneau-site">
    <form id="login">
      <p class="intro" style="margin-bottom:0">Cette partie est protégée par le code d’accès des officiers.</p>
      <label for="code">Code d’accès
        <input id="code" type="password" autocomplete="current-password" required></label>
      <button class="btn btn-or" type="submit">Se connecter</button>
      <div id="login-retour" role="status"></div>
    </form>
    <div id="tableau" hidden>
      <div class="admin-barre"><span>Code officier validé</span>
        <button class="btn btn-ligne petit" type="button" id="deconnexion">Verrouiller</button></div>
    <h3>Annonce de guilde</h3>
    <label for="a-annonce">Message affiché en bannière sur la page d’accueil
      <textarea id="a-annonce" maxlength="300" style="min-height:80px"></textarea></label>
    <h3>Recrutement</h3>
    <div id="a-rec"></div>
    <h3>Progression des raids</h3>
    <div id="a-raids"></div>
    <button class="btn btn-ligne petit" type="button" id="a-ajout">+ Ajouter un raid</button>
    <div class="admin-pied">
      <button class="btn btn-or" type="button" id="a-sauver">Sauvegarder</button>
      <div id="a-retour" role="status"></div>
    </div>
    </div>
  </div>

  <div id="panneau-raids" hidden>
    <div id="raids-gate" class="verrou">
      <p>Cette partie est réservée aux officiers connectés.</p>
      <button type="button" class="btn btn-or js-ouvrir-auth">Se connecter</button>
    </div>
    <div id="raids-contenu" hidden>
      <h3>Créer un raid</h3>
      <form id="f-raid">
        <div class="a-grille">
          <label class="pleine">Titre<input id="c-titre" required maxlength="60"></label>
          <label>Date<input id="c-date" type="date" required></label>
          <label>Rassemblement<input id="c-rass" type="time" value="20:30" required></label>
          <label>Début<input id="c-debut" type="time" value="20:45" required></label>
          <label>Tanks<input id="c-tank" type="number" min="0" max="40" value="2"></label>
          <label>Soigneurs<input id="c-heal" type="number" min="0" max="40" value="4"></label>
          <label>DPS<input id="c-dps" type="number" min="0" max="40" value="4"></label>
        </div>
        <button class="btn btn-or" type="submit">Créer le raid</button>
      </form>
      <div id="a-cal"></div>
      <div id="c-retour" role="status"></div>
    </div>
  </div>

  <div id="panneau-membres" hidden>
    <div id="membres-gate" class="verrou">
      <p>Cette partie est réservée aux officiers.</p>
      <button type="button" class="btn btn-or js-ouvrir-auth">Se connecter</button>
    </div>
    <div id="membres-contenu" hidden>
      <h3>Comptes des membres</h3>
      <div id="a-membres" class="a-ins"></div>
      <div id="m-retour" role="status"></div>
    </div>
  </div>
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
      <a class="tw" id="tw-badge" href="#" target="_blank" rel="noopener" hidden>${ICONE_TWITCH}<i class="pt" aria-hidden="true"></i><span id="tw-txt">Twitch</span></a>
      <div class="compte" id="compte">
        <button type="button" class="btn-compte" id="btn-connexion"><span class="long">Connexion / S’inscrire</span><span class="court">Connexion</span></button>
        <a class="btn-compte" id="btn-profil" href="roster.html#mon-personnage" hidden>${ICONE_USER}<span id="compte-pseudo"></span></a>
        <button type="button" class="btn-compte discret" id="btn-deconnexion" hidden>Déconnexion</button>
      </div>
      <button type="button" class="burger" id="burger" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>
<div class="annonce" id="annonce" hidden><div class="wrap"><strong>Annonce</strong><span id="annonce-txt"></span></div></div>`);
  document.body.insertAdjacentHTML("beforeend", PIED + LECTEUR + MODALES);
}
injecterMiseEnPage();

const entete = $("#entete"), burger = $("#burger");
burger.onclick = () => { const ouvert = entete.classList.toggle("ouvert"); burger.setAttribute("aria-expanded", String(ouvert)); };

/* État du site & Données */
const etat = { annonce:"", recrutement:{}, raids:[] };
function appliquer(d){
  etat.annonce = typeof d?.annonce === "string" ? d.annonce : "";
  if(typeof CLASSES !== "undefined") {
    CLASSES.forEach(c => {
      const x = d?.recrutement?.[c.nom];
      etat.recrutement[c.nom] = {
        note: typeof x?.note === "string" ? x.note : c.note,
        specs: Object.fromEntries(c.specs.map(sp => [sp, LIBELLES[x?.specs?.[sp]] ? x.specs[sp] : c.statut]))
      };
    });
  }
  etat.raids = Array.isArray(d?.raids) ? d.raids : [];
}
appliquer({});

fetch("/api/data", { cache:"no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { if(d && Object.keys(d).length){ appliquer(d); signaler("site"); } })
  .catch(() => {});

/* Session & Authentification locales / Cloudflare D1 */
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

// Gestion de la modale d'authentification
const dAuth = $("#dlg-auth");
let modeAuth = "connexion";
function modeAuthSet(m){
  modeAuth = m;
  const ins = m === "inscription";
  if($("#auth-retour")) $("#auth-retour").innerHTML = "";
  document.querySelectorAll("#auth-onglets button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
  if($("#auth-pseudo-bloc")) $("#auth-pseudo-bloc").hidden = !ins;
  if($("#au-pseudo")) $("#au-pseudo").required = ins;
  if($("#au-mdp-lib")) $("#au-mdp-lib").textContent = "Mot de passe";
  if($("#au-envoi")) $("#au-envoi").textContent = ins ? "Créer mon compte" : "Se connecter";
  if($("#au-aide")) $("#au-aide").textContent = ins ? "Un officier validera votre compte pour vous donner accès au calendrier." : "";
}
function ouvrirAuth(m = "connexion"){
  if(SB_OK) modeAuthSet(m);
  if(dAuth && !dAuth.open) dAuth.showModal();
}
if($("#auth-onglets")) $("#auth-onglets").addEventListener("click", e => { if(e.target.dataset.m) modeAuthSet(e.target.dataset.m); });
if($("#auth-fermer")) $("#auth-fermer").onclick = () => dAuth.close();
if(dAuth) dAuth.addEventListener("click", e => { if(e.target === dAuth) dAuth.close(); });
if($("#btn-connexion")) $("#btn-connexion").onclick = () => ouvrirAuth("connexion");
if($("#btn-deconnexion")) $("#btn-deconnexion").onclick = () => {
  localStorage.removeItem("legion_session");
  session = null; profil = null;
  majInterface(); location.reload();
};

/* Délégation globale pour la soumission du formulaire d'authentification */
document.addEventListener("submit", async e => {
  if (e.target && e.target.id === "f-auth") {
    e.preventDefault();
    const retour = $("#auth-retour");
    const bouton = $("#au-envoi");
    const email = $("#au-email").value.trim();
    const password = $("#au-mdp").value;
    const pseudo = $("#au-pseudo") ? $("#au-pseudo").value.trim() : "";

    if (bouton) bouton.disabled = true;
    if (retour) retour.innerHTML = '<div class="msg">Connexion en cours…</div>';

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: modeAuth, email, password, pseudo })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.erreur || "Erreur de connexion");

      if (modeAuth === "inscription") {
        if (retour) retour.innerHTML = `<div class="msg">${esc(d.message)}</div>`;
      } else {
        session = d.session;
        profil = d.profil;
        localStorage.setItem("legion_session", JSON.stringify({ session, profil }));
        if (dAuth) dAuth.close();
        majInterface();
        location.reload();
      }
    } catch(err) {
      if (retour) retour.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    } finally {
      if (bouton) bouton.disabled = false;
    }
  }
});

/* Espace Officier */
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
  if(connecte && typeof remplirAdmin === "function") remplirAdmin(etat);
}

if($("#ouvrir-admin")) $("#ouvrir-admin").onclick = () => { if($("#login-retour")) $("#login-retour").innerHTML = ""; if(adm) { afficherAdmin(!!codeOfficier); adm.showModal(); } };
if($("#admin-fermer")) $("#admin-fermer").onclick = () => adm.close();
if(adm) adm.addEventListener("click", e => { if(e.target === adm) adm.close(); });

if(login) {
  login.addEventListener("submit", async e => {
    e.preventDefault();
    const retour = $("#login-retour"), code = $("#code").value;
    retour.innerHTML = '<div class="msg">Vérification…</div>';
    try{
      const r = await api({ code, verifier:true });
      if(r.ok){
        codeOfficier = code;
        try{ sessionStorage.setItem("legion_code", code); }catch{}
        $("#code").value = ""; retour.innerHTML = "";
        afficherAdmin(true);
      }else{
        retour.innerHTML = `<div class="msg err">${esc(r.statut === 401 ? "Code incorrect." : r.erreur || "Erreur")}</div>`;
      }
    }catch{
      retour.innerHTML = '<div class="msg err">Serveur injoignable.</div>';
    }
  });
}

// Gestion des onglets de l'Espace Officier
let membres = [], ongletAdmin = "site";
function afficherOnglet(p){
  ongletAdmin = p;
  document.querySelectorAll(".onglets-admin button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === p));
  if($("#panneau-site")) $("#panneau-site").hidden = p !== "site";
  if($("#panneau-raids")) $("#panneau-raids").hidden = p !== "raids";
  if($("#panneau-membres")) $("#panneau-membres").hidden = p !== "membres";
  if(estOfficier() && p === "membres") chargerMembres();
}
document.querySelectorAll(".onglets-admin button").forEach(b => b.onclick = () => afficherOnglet(b.dataset.p));

function majAdminAcces(){
  const off = estOfficier();
  ["raids", "membres"].forEach(k => { 
    if($("#" + k + "-gate")) $("#" + k + "-gate").hidden = off; 
    if($("#" + k + "-contenu")) $("#" + k + "-contenu").hidden = !off; 
  });
  if(off && ongletAdmin !== "site") afficherOnglet(ongletAdmin);
}
document.querySelectorAll(".js-ouvrir-auth").forEach(b => b.onclick = () => ouvrirAuth("connexion"));

async function chargerMembres(){
  try {
    const res = await fetch("/api/admin-membres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lister", userId: session?.user?.id })
    });
    const d = await res.json();
    if(!res.ok) throw new Error(d.erreur || "Erreur");
    membres = d.membres || [];
    dessinerMembres();
  } catch(err) {
    if($("#m-retour")) $("#m-retour").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
}

function dessinerMembres(){
  const ordre = { en_attente:0, membre:1, officier:2, refuse:3 };
  const tri = [...membres].sort((a, b) => (ordre[a.role] ?? 4) - (ordre[b.role] ?? 4) || a.pseudo.localeCompare(b.pseudo));
  const attente = membres.filter(m => m.role === "en_attente").length;
  if($("#compteur-membres")) $("#compteur-membres").textContent = attente ? ` (${attente})` : "";
  if($("#a-membres")) {
    $("#a-membres").innerHTML = tri.map(m => `
      <div class="a-ligne${m.role === "en_attente" ? " attente" : ""}">
        <span class="a-nom"><b>${esc(m.pseudo)}</b> <small>inscrit le ${esc(new Date(m.cree_le).toLocaleDateString("fr-FR"))}</small></span>
        <select data-membre="${esc(m.id)}" aria-label="Rôle de ${esc(m.pseudo)}">
          <option value="en_attente"${m.role === "en_attente" ? " selected" : ""}>En attente</option>
          <option value="membre"${m.role === "membre" ? " selected" : ""}>Membre</option>
          <option value="officier"${m.role === "officier" ? " selected" : ""}>Officier</option>
          <option value="refuse"${m.role === "refuse" ? " selected" : ""}>Refusé</option>
        </select>
      </div>`).join("") || '<p class="intro">Aucun compte pour le moment.</p>';
  }
}

if($("#a-membres")) {
  $("#a-membres").addEventListener("change", async e => {
    const id = e.target.dataset.membre;
    const nouveauRole = e.target.value;
    if(!id) return;
    try {
      const res = await fetch("/api/admin-membres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "modifier_role", targetId: id, nouveauRole, userId: session?.user?.id })
      });
      const d = await res.json();
      if(!res.ok) throw new Error(d.erreur || "Erreur");
      chargerMembres();
    } catch(err) {
      if($("#m-retour")) $("#m-retour").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    }
  });
}
