/* =====================================================================
   commun.js : ce qui est partagé par TOUTES les pages (menu, pied de page, hymne, comptes,
   Espace Officier). Vous n'avez normalement rien à modifier ici : tous les réglages sont dans config.js.
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PAGE = document.body.dataset.page || "accueil";
const LIBELLES = { ouvert:"Ouvert", ferme:"Fermé", prio:"Recherche prioritaire" };
const TWITCH_OK = /^[A-Za-z0-9_]{3,25}$/.test(TWITCH_CHANNEL_NAME) && TWITCH_CHANNEL_NAME !== "ton_pseudo_twitch";
const TWITCH_URL = "https://www.twitch.tv/" + TWITCH_CHANNEL_NAME;
// Les pages se préviennent entre elles par de petits signaux (session, site, persos, calendrier)
function signaler(nom){ document.dispatchEvent(new CustomEvent("legion:" + nom)); }

/* ---------- Mise en page commune : menu, annonce, pied de page, lecteur de l'hymne, fenêtres ---------- */
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
  <p class="intro" id="auth-indispo" hidden style="margin-top:1rem">Les comptes membres ne sont pas encore activés sur ce site. Revenez bientôt, ou contactez un officier sur notre Discord.</p>
  <form id="f-auth">
    <div id="auth-pseudo-bloc" hidden>
      <label for="au-pseudo">Pseudo affiché sur le site
        <input id="au-pseudo" maxlength="24" minlength="2" autocomplete="nickname"></label>
    </div>
    <div id="auth-email-bloc">
      <label for="au-email">Adresse e-mail
        <input id="au-email" type="email" required autocomplete="email"></label>
    </div>
    <div id="auth-ancien-bloc" hidden>
      <label for="au-ancien">Mot de passe actuel (celui que l’officier vous a donné)
        <input id="au-ancien" type="password" autocomplete="current-password"></label>
    </div>
    <label for="au-mdp"><span id="au-mdp-lib">Mot de passe</span>
      <input id="au-mdp" type="password" required minlength="10" maxlength="128" autocomplete="current-password"></label>
    <button class="btn btn-or" type="submit" id="au-envoi">Se connecter</button>
    <button type="button" class="lien-bouton" id="au-oubli">Mot de passe oublié ?</button>
    <button type="button" class="lien-bouton" id="au-renvoyer" hidden>Renvoyer l’e-mail de confirmation</button>
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
  <div id="admin-gate" class="verrou">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>
    <p>L’Espace Officier est réservé aux officiers connectés avec leur compte.</p>
    <button type="button" class="btn btn-or js-ouvrir-auth">Se connecter</button>
  </div>
  <div id="admin-contenu" hidden>
    <div class="onglets onglets-admin" role="group" aria-label="Sections de l’Espace Officier">
      <button type="button" data-p="site" aria-pressed="true">Annonce, recrutement, progression</button>
      <button type="button" data-p="raids" aria-pressed="false">Calendrier &amp; roster</button>
      <button type="button" data-p="membres" aria-pressed="false">Membres<span id="compteur-membres"></span></button>
    </div>

    <div id="panneau-site">
    <h3>Annonce de guilde</h3>
    <label for="a-annonce">Message affiché en bannière sur la page d’accueil (laisser vide pour ne rien afficher)
      <textarea id="a-annonce" maxlength="300" style="min-height:80px" placeholder="Prochain raid jeudi à 20h30…"></textarea></label>

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

    <div id="panneau-raids" hidden>
      <h3>Créer un raid</h3>
      <form id="f-raid">
        <div class="a-grille">
          <label class="pleine">Titre (ex : Naxxramas)<input id="c-titre" required maxlength="60"></label>
          <label>Date<input id="c-date" type="date" required></label>
          <label>Rassemblement<input id="c-rass" type="time" value="20:30" required></label>
          <label>Début<input id="c-debut" type="time" value="20:45" required></label>
          <label>Tanks<input id="c-tank" type="number" min="0" max="40" value="2"></label>
          <label>Soigneurs<input id="c-heal" type="number" min="0" max="40" value="4"></label>
          <label>DPS<input id="c-dps" type="number" min="0" max="40" value="4"></label>
          <label class="pleine">Description (facultatif)<textarea id="c-desc" maxlength="300" style="min-height:70px" placeholder="Objectifs, consommables, remarques…"></textarea></label>
        </div>
        <button class="btn btn-or" type="submit" style="width:auto;padding-inline:2rem">Créer le raid</button>
      </form>
      <h3>Raids et roster</h3>
      <p class="intro" style="margin-bottom:1rem">Les changements faits ici (statut, roster, archivage) s’appliquent tout de suite.</p>
      <div id="a-cal"></div>
      <div id="c-retour" role="status"></div>
    </div>

    <div id="panneau-membres" hidden>
      <h3>Comptes des membres</h3>
      <p class="intro" style="margin-bottom:1rem">Les comptes se valident tout seuls : le membre confirme son adresse en cliquant sur le lien reçu par e-mail. Ici, vous pouvez changer un rôle, confirmer à la main une adresse si l’e-mail n’arrive pas, générer un mot de passe temporaire à un membre qui a oublié le sien, ou supprimer un compte.</p>
      <div id="a-membres" class="a-ins"></div>
      <div id="m-retour" role="status"></div>
    </div>
  </div>
</dialog>

`;

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
        <button type="button" class="btn-compte" id="btn-connexion" hidden><span class="long">Connexion / S’inscrire</span><span class="court">Connexion</span></button>
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
// « Postuler » : ouvre le formulaire s'il est sur la page (accueil), sinon renvoie vers l'accueil
document.querySelectorAll(".js-postuler").forEach(a => a.addEventListener("click", e => { if(typeof ouvrir === "function"){ e.preventDefault(); ouvrir(); } }));




/* État du site : valeurs de départ, remplacées par ce que les officiers enregistrent */
const etat = { annonce:"", recrutement:{}, raids:[] };
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

/* Annonce (bannière affichée sous le menu, sur toutes les pages) */
function dessinerAnnonce(){
  $("#annonce").hidden = !etat.annonce.trim();
  $("#annonce-txt").textContent = etat.annonce;
}
document.addEventListener("legion:site", dessinerAnnonce);
dessinerAnnonce();
// Récupère ce que les officiers ont enregistré (ne fonctionne qu'une fois le site en ligne sur Cloudflare Pages)
fetch("/api/site", { cache:"no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { if(d && Object.keys(d).length){ appliquer(d); signaler("site"); } })
  .catch(() => {});

/* ===== Comptes membres, armurerie et calendrier de raid (API Cloudflare + base D1) ===== */
let profil = null, mesPersos = [], persoConnus = {}, sessionPrete = false;
const acces = () => profil ? profil.role : "visiteur";   // visiteur | en_attente | refuse | membre | officier
const estMembre = () => acces() === "membre" || acces() === "officier";
const estOfficier = () => acces() === "officier";

const ROLE_LIBELLE = { tank:"Tank", soigneur:"Soigneur", dps:"DPS" };
const ROLE_PLURIEL = { tank:"Tanks", soigneur:"Soigneurs", dps:"DPS" };
const ROLE_ICONE = {
  tank:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg>',
  soigneur:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
  dps:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M20 4 10 14M7 11l6 6M8.5 15.5 4 20"/></svg>'
};
const CADENAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>';
const ROLE_DEFAUT = {
  Guerrier:{ Armes:"dps", Fureur:"dps", Protection:"tank" },
  Paladin:{ "Sacré":"soigneur", Protection:"tank", Vindicte:"dps" },
  "Prêtre":{ Discipline:"soigneur", "Sacré":"soigneur", Ombre:"dps" },
  Chamane:{ "Élémentaire":"dps", "Amélioration":"dps", Restauration:"soigneur" },
  Druide:{ "Équilibre":"dps", "Combat farouche":"dps", Restauration:"soigneur" }
};
const roleDe = (c, sp) => ROLE_DEFAUT[c]?.[sp] || "dps";
const METIERS = ["Alchimie","Forge","Ingénierie","Enchantement","Couture","Travail du cuir","Herboristerie","Minage","Dépeçage","Cuisine","Secourisme","Pêche"];
const PRES = { present:"Présent", retard:"En retard", absent:"Absent" };
const ETIQ = { ouvert:"Ouvert aux inscriptions", complet:"Complet", annule:"Annulé" };
const jourFmt = new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"numeric", month:"long" });
const couleurDe = n => CLASSES.find(c => c.nom === n)?.couleur || "#d9d6c9";
const debutDe = r => new Date(`${r.date}T${r.debut}`);
const maj = t => t.charAt(0).toUpperCase() + t.slice(1);
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const hhmm = t => String(t || "").slice(0, 5);

// Appel de l'API du site : ne plante jamais, renvoie toujours { ok, statut, ...réponse }
async function appel(chemin, corps){
  const options = corps === undefined ? { cache:"no-store" } : { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(corps) };
  try{
    const r = await fetch("/api/" + chemin, options);
    let d = {}; try{ d = await r.json(); }catch{}
    return { ok:r.ok, statut:r.status, ...d };
  }catch{
    return { ok:false, statut:0, erreur:"Connexion impossible. Vérifiez votre connexion internet puis réessayez." };
  }
}
function messageErreur(r){ return (r && r.erreur) || "Une erreur est survenue. Réessayez dans un instant."; }
const erreurHtml = r => `<div class="msg err">${esc(messageErreur(r))}</div>`;

/* ---------- Session et interface ---------- */
async function majSession(){
  const r = await appel("auth/moi");
  profil = r.ok && r.membre ? r.membre : null;
  mesPersos = [];
  if(profil) await chargerPersos();
  sessionPrete = true;
  majInterface();
}
function majInterface(){
  const connecte = !!profil;
  $("#btn-connexion").hidden = connecte;
  $("#btn-profil").hidden = !connecte;
  $("#btn-deconnexion").hidden = !connecte;
  if(connecte) $("#compte-pseudo").textContent = profil.pseudo;
  majAdminAcces();
  signaler("session");
  if(profil && profil.mdpTemporaire && !dAuth.open) ouvrirAuth("nouveau");   // mot de passe temporaire : on demande d'en choisir un
}
majSession();
setInterval(() => { if(document.visibilityState === "visible" && profil && !estMembre()) majSession(); }, 60000);  // détecte un changement de rôle fait par un officier

/* ---------- Fenêtre de connexion / création de compte ---------- */
const dAuth = $("#dlg-auth");
let modeAuth = "connexion";
function modeAuthSet(m){
  modeAuth = m;
  const ins = m === "inscription", nouveau = m === "nouveau";
  $("#auth-retour").innerHTML = "";
  $("#auth-onglets").hidden = nouveau;
  document.querySelectorAll("#auth-onglets button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
  $("#auth-pseudo-bloc").hidden = !ins;
  $("#auth-email-bloc").hidden = nouveau;
  $("#auth-ancien-bloc").hidden = !nouveau;
  $("#au-email").required = !nouveau; $("#au-pseudo").required = ins; $("#au-ancien").required = nouveau;
  $("#au-mdp-lib").textContent = nouveau ? "Nouveau mot de passe (10 caractères minimum)" : ins ? "Mot de passe (10 caractères minimum)" : "Mot de passe";
  $("#au-mdp").autocomplete = ins || nouveau ? "new-password" : "current-password";
  $("#au-envoi").textContent = ins ? "Créer mon compte" : nouveau ? "Enregistrer le mot de passe" : "Se connecter";
  $("#au-oubli").hidden = m !== "connexion";
  $("#au-renvoyer").hidden = true;
  $("#au-aide").textContent = ins ? "Un e-mail de confirmation vous sera envoyé : cliquez sur le lien qu’il contient pour activer votre compte." : nouveau ? "Votre mot de passe était temporaire : choisissez-en un nouveau pour continuer." : "";
  $("#auth-titre").textContent = nouveau ? "Nouveau mot de passe" : "Espace membres";
}
function ouvrirAuth(m = "connexion"){
  modeAuthSet(m);
  if(!dAuth.open) dAuth.showModal();
}
$("#auth-onglets").addEventListener("click", e => { if(e.target.dataset.m) modeAuthSet(e.target.dataset.m); });
$("#auth-fermer").onclick = () => dAuth.close();
dAuth.addEventListener("click", e => { if(e.target === dAuth) dAuth.close(); });
$("#btn-connexion").onclick = () => ouvrirAuth("connexion");
$("#btn-deconnexion").onclick = async () => { await appel("auth/deconnexion", {}); await majSession(); };

$("#f-auth").addEventListener("submit", async e => {
  e.preventDefault();
  const retour = $("#auth-retour"), bouton = $("#au-envoi"), email = $("#au-email").value.trim(), mdp = $("#au-mdp").value;
  bouton.disabled = true; retour.innerHTML = ""; $("#au-renvoyer").hidden = true;
  const r = modeAuth === "connexion" ? await appel("auth/connexion", { email, mdp })
          : modeAuth === "inscription" ? await appel("auth/inscription", { email, mdp, pseudo:$("#au-pseudo").value.trim() })
          : await appel("auth/mot-de-passe", { ancien:$("#au-ancien").value, nouveau:mdp });
  bouton.disabled = false;
  if(!r.ok){
    retour.innerHTML = erreurHtml(r);
    if(r.emailNonVerifie) $("#au-renvoyer").hidden = false;
    return;
  }
  if(modeAuth === "inscription"){
    // Pas de connexion tout de suite : l'adresse e-mail doit d'abord être confirmée
    retour.innerHTML = r.emailEnvoye
      ? `<div class="msg">Compte créé ! Un e-mail de confirmation vient d’être envoyé à <b>${esc(email)}</b>. Cliquez sur le lien qu’il contient (pensez à regarder les courriers indésirables), puis connectez-vous.</div>`
      : '<div class="msg err">Compte créé, mais l’e-mail de confirmation n’a pas pu être envoyé. Cliquez sur « Renvoyer l’e-mail de confirmation » ci-dessous.</div>';
    $("#au-renvoyer").hidden = false;
    return;
  }
  const etaitNouveau = modeAuth === "nouveau";
  $("#au-mdp").value = ""; $("#au-ancien").value = "";
  dAuth.close();
  await majSession();
  if(etaitNouveau) alert("Votre mot de passe a été modifié.");
});
$("#au-renvoyer").onclick = async () => {
  const retour = $("#auth-retour"), bouton = $("#au-renvoyer");
  bouton.disabled = true;
  const r = await appel("auth/renvoyer", { email:$("#au-email").value.trim(), mdp:$("#au-mdp").value });
  bouton.disabled = false;
  retour.innerHTML = !r.ok ? erreurHtml(r)
    : r.emailEnvoye ? '<div class="msg">Nouvel e-mail envoyé. Cliquez sur le lien qu’il contient, puis connectez-vous.</div>'
    : '<div class="msg err">L’e-mail n’a pas pu être envoyé. Réessayez dans quelques minutes ou contactez un officier sur notre Discord.</div>';
};
$("#au-oubli").onclick = () => {
  $("#auth-retour").innerHTML = `<div class="msg">Il n’y a pas d’e-mail de réinitialisation sur ce site : demandez à un officier sur <a href="${LIEN_DISCORD}" target="_blank" rel="noopener">notre Discord</a>. Il vous donnera un mot de passe temporaire, à changer dès votre connexion.</div>`;
};

// Les raids reçus du serveur sont déjà au bon format ; on retient seulement les fiches des personnages inscrits
function adapter(r){
  (r.inscriptions || []).forEach(i => {
    persoConnus[i.persoId] = { id:i.persoId, nom:i.pseudo, classe:i.classe, specialisation:i.spe, role:i.persoRole, niveau:i.niveau, metier1:i.metier1, metier2:i.metier2, joueur:i.joueur };
  });
  return r;
}
function verrou(texte, boutons = ""){ return `<div class="verrou">${CADENAS}<p>${texte}</p>${boutons}</div>`; }

/* ---------- Armurerie : mes personnages ---------- */
async function chargerPersos(){
  const r = await appel("personnages");
  mesPersos = r.ok ? r.personnages : [];
  mesPersos.forEach(p => { persoConnus[p.id] = { ...p, joueur:profil?.pseudo || "" }; });
}
function carteDe(p, actions = ""){
  const c = couleurDe(p.classe), metiers = [p.metier1, p.metier2].filter(Boolean);
  return `<article class="perso" style="--cl:${c};--glow:${hexA(c, .3)}">
    <div class="perso-embleme" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="41" stroke-dasharray="3 5"/><path d="M50 8 56 44 92 50 56 56 50 92 44 56 8 50 44 44Z"/></svg><b>${esc(p.classe.charAt(0))}</b></div>
    <div class="perso-corps">
      <h3>${esc(p.nom)}</h3>
      <div class="perso-classe">${esc(p.classe)} · ${esc(p.specialisation)}</div>
      <div class="perso-role role-${esc(p.role)}">${ROLE_ICONE[p.role] || ""} ${ROLE_LIBELLE[p.role] || ""}</div>
      <div class="perso-meta">Niveau ${+p.niveau}${metiers.length ? " · " + metiers.map(esc).join(", ") : ""}</div>
      ${p.joueur ? `<div class="perso-meta">Joueur : ${esc(p.joueur)}</div>` : ""}
      ${actions}
    </div></article>`;
}
const dPerso = $("#dlg-perso"), pClasse = $("#p-classe"), pSpe = $("#p-spe");
CLASSES.forEach(c => pClasse.add(new Option(c.nom, c.nom)));
[$("#p-m1"), $("#p-m2")].forEach(s => METIERS.forEach(m => s.add(new Option(m, m))));
pClasse.onchange = () => {
  const c = CLASSES.find(x => x.nom === pClasse.value);
  pSpe.length = 1; pSpe.disabled = !c;
  pSpe.options[0].text = c ? "Choisir une spécialisation" : "Choisissez d’abord une classe";
  if(c) c.specs.forEach(sp => pSpe.add(new Option(sp, sp)));
};
pSpe.onchange = () => { if(pSpe.value) $("#p-role").value = roleDe(pClasse.value, pSpe.value); };
function ouvrirPerso(p){
  $("#perso-retour").innerHTML = "";
  $("#perso-titre").textContent = p ? "Modifier mon personnage" : "Nouveau personnage";
  $("#p-id").value = p ? p.id : "";
  $("#p-nom").value = p ? p.nom : "";
  pClasse.value = p ? p.classe : ""; pClasse.onchange();
  pSpe.value = p ? p.specialisation : "";
  $("#p-role").value = p ? p.role : "dps";
  $("#p-niveau").value = p ? p.niveau : "";
  $("#p-m1").value = p?.metier1 || ""; $("#p-m2").value = p?.metier2 || "";
  dPerso.showModal();
}
$("#perso-fermer").onclick = () => dPerso.close();
dPerso.addEventListener("click", e => { if(e.target === dPerso) dPerso.close(); });
$("#f-perso").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => $("#" + id).value.trim(), bouton = e.target.querySelector("button[type=submit]");
  const ligne = { nom:v("p-nom"), classe:v("p-classe"), specialisation:v("p-spe"), role:v("p-role"),
    niveau:Math.max(1, Math.min(90, parseInt(v("p-niveau"), 10) || 1)), metier1:v("p-m1") || null, metier2:v("p-m2") || null };
  bouton.disabled = true;
  const pid = v("p-id");
  const r = await appel("personnages", pid ? { action:"modifier", id:pid, ...ligne } : { action:"creer", ...ligne });
  bouton.disabled = false;
  if(!r.ok){ $("#perso-retour").innerHTML = erreurHtml(r); return; }
  dPerso.close(); await chargerPersos(); signaler("persos"); signaler("calendrier");
});
$("#dlg-fiche").addEventListener("click", e => { if(e.target === e.currentTarget || e.target.id === "fiche-fermer") e.currentTarget.close(); });


/* Lecteur de l'hymne : l'état de lecture est mémorisé d'une page à l'autre */
const hymne = $("#hymne"), lec = $("#lecteur"), etatLec = $("#l-etat"), vol = $("#l-vol");
let etatMemo = null;
try{ etatMemo = JSON.parse(sessionStorage.getItem("legion_audio") || "null"); }catch{}
let cible = etatMemo && typeof etatMemo.vol === "number" ? etatMemo.vol : VOLUME_DEPART;
let minuteur, bloque = false, arretVolontaire = !!(etatMemo && etatMemo.arret);
hymne.volume = 0;               // départ silencieux, puis montée en douceur
hymne.src = FICHIER_HYMNE;
vol.value = cible;
if(etatMemo && etatMemo.muet) hymne.muted = true;
if(etatMemo && etatMemo.t > 0) hymne.addEventListener("loadedmetadata", () => { try{ hymne.currentTime = etatMemo.t % (hymne.duration || 1e9); }catch{} }, { once:true });
function memoriser(){
  try{ sessionStorage.setItem("legion_audio", JSON.stringify({ t:hymne.currentTime || 0, vol:cible, muet:hymne.muted, arret:arretVolontaire })); }catch{}
}
addEventListener("pagehide", memoriser);
setInterval(memoriser, 1000);

function fondu(v, ms = 2000){
  clearInterval(minuteur);
  const depart = hymne.volume, n = Math.max(1, ms / 50);
  let i = 0;
  minuteur = setInterval(() => {
    i++;
    hymne.volume = Math.min(1, Math.max(0, depart + (v - depart) * i / n));
    if(i >= n) clearInterval(minuteur);
  }, 50);
}
function majLecteur(){
  const joue = !hymne.paused;
  lec.classList.toggle("joue", joue);
  lec.classList.toggle("attente", bloque && !joue);
  lec.classList.toggle("muet", hymne.muted || cible === 0);
  etatLec.textContent = joue ? (lec.classList.contains("muet") ? "Son coupé" : "En lecture") : bloque ? "Cliquez pour lancer" : "Musique arrêtée";
  $("#l-play").setAttribute("aria-label", joue ? "Arrêter l’hymne" : "Lancer l’hymne");
  $("#l-play").title = joue ? "Arrêter la musique" : "Lancer la musique";
}
async function lancer(){
  let ok = false;
  try{
    if(hymne.paused) hymne.volume = 0;
    await hymne.play();
    bloque = false; ok = true;
    fondu(cible);          // montée du son en douceur
    desarmer();
  }catch{
    bloque = true;         // le navigateur bloque la lecture automatique
  }
  majLecteur();
  return ok;
}

// Sécurité : si le navigateur bloque la lecture au chargement, la musique démarre
// dès le premier clic ou toucher du visiteur, n'importe où sur le site.
const PREMIERS_GESTES = ["pointerdown", "pointerup", "click", "touchend"];
function premierGeste(e){
  if(e.target.closest && e.target.closest("#l-play")) return;   // le bouton gère lui-même son clic
  lancer();
}
function armer(){ PREMIERS_GESTES.forEach(t => window.addEventListener(t, premierGeste, true)); }
function desarmer(){ PREMIERS_GESTES.forEach(t => window.removeEventListener(t, premierGeste, true)); }
$("#l-play").onclick = () => {
  if(hymne.paused){ arretVolontaire = false; lancer(); }
  else { arretVolontaire = true; hymne.pause(); memoriser(); }
};
$("#l-mute").onclick = () => {
  if(cible === 0){ cible = VOLUME_DEPART; vol.value = cible; hymne.volume = cible; hymne.muted = false; }
  else hymne.muted = !hymne.muted;
  majLecteur();
};
vol.oninput = () => {
  clearInterval(minuteur);
  cible = +vol.value; hymne.volume = cible;
  if(cible > 0) hymne.muted = false;
  majLecteur();
};
hymne.addEventListener("play", majLecteur);
hymne.addEventListener("pause", majLecteur);
if(arretVolontaire || !LANCER_AUTO){ bloque = !arretVolontaire; majLecteur(); }
else { armer(); lancer(); }


/* Twitch : badge d'en-tête (toutes les pages) et détection du direct */
function etatLive(enLigne){
  const b = $("#tw-badge");
  b.classList.toggle("live", enLigne);
  b.setAttribute("aria-label", enLigne ? "Chaîne Twitch : en direct maintenant" : "Chaîne Twitch");
  $("#tw-txt").textContent = enLigne ? "EN LIVE" : "Twitch";
  const hors = $("#tw-hors"); if(hors) hors.hidden = enLigne;
  const lecteur = $("#tw-lecteur"); if(lecteur) lecteur.classList.toggle("cache", !enLigne);
}
// Détection du direct par le serveur (API officielle de Twitch) : plus fiable que le lecteur seul.
// Elle ne s'active que si les clés Twitch sont réglées dans Cloudflare ; sinon, sur l'accueil, on utilise le lecteur.
let sourceApi = false;
async function sonderTwitch(){
  try{
    const r = await fetch("/api/twitch?channel=" + encodeURIComponent(TWITCH_CHANNEL_NAME));
    const d = r.ok ? await r.json() : null;
    if(d && d.configure === true && typeof d.live === "boolean"){ sourceApi = true; etatLive(d.live); }
  }catch{}
}
if(TWITCH_OK){
  $("#tw-badge").href = TWITCH_URL; $("#tw-badge").hidden = false;
  sonderTwitch();
  setInterval(() => { if(document.visibilityState === "visible") sonderTwitch(); }, 60000);
}

/* Espace Officier : tout se fait avec un compte officier */
const adm = $("#admin");
let adminEvts = [], membresAdmin = [], ongletAdmin = "site";

function optionsStatut(v){
  return Object.entries(LIBELLES).map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("");
}
function remplirAdmin(d){
  $("#a-annonce").value = d.annonce;
  $("#a-rec").innerHTML = CLASSES.map((c, ci) => `
    <fieldset class="a-classe" style="--cl:${c.couleur}"><legend>${esc(c.nom)}</legend>
      <label>Note affichée sur la carte
        <input data-note="${ci}" maxlength="80" value="${esc(d.recrutement[c.nom].note)}"></label>
      <div class="a-specs">${c.specs.map((sp, si) => `
        <label>${esc(sp)}<select data-ci="${ci}" data-si="${si}">${optionsStatut(d.recrutement[c.nom].specs[sp])}</select></label>`).join("")}
      </div></fieldset>`).join("");
  dessinerChampsRaids(d.raids);
}
function dessinerChampsRaids(raids){
  $("#a-raids").innerHTML = raids.map((r, i) => `
    <div class="a-raid">
      <label class="nom">Nom du raid<input data-f="nom" maxlength="60" value="${esc(r.nom)}"></label>
      <label>Boss vaincus<input data-f="tues" type="number" min="0" max="99" value="${+r.tues}"></label>
      <label>Total<input data-f="total" type="number" min="1" max="99" value="${+r.total}"></label>
      <label>Mention (ex : HM)<input data-f="mention" maxlength="30" value="${esc(r.mention)}"></label>
      <label class="pleine">Remarques / dates de chute des boss<input data-f="note" maxlength="200" value="${esc(r.note)}"></label>
      <div class="pleine"><button class="btn btn-ligne petit" type="button" data-sup="${i}" style="margin-top:.6rem">Supprimer ce raid</button></div>
    </div>`).join("");
}
function lireAdmin(){
  const rec = {};
  CLASSES.forEach((c, ci) => {
    rec[c.nom] = { note:$(`[data-note="${ci}"]`).value.trim(), specs:{} };
    c.specs.forEach((sp, si) => rec[c.nom].specs[sp] = $(`[data-ci="${ci}"][data-si="${si}"]`).value);
  });
  return { annonce:$("#a-annonce").value.trim(), recrutement:rec, raids:lireRaids() };
}
function lireRaids(){
  return [...document.querySelectorAll(".a-raid")].map(el => {
    const v = f => el.querySelector(`[data-f="${f}"]`).value;
    const total = Math.max(1, Math.min(99, parseInt(v("total"), 10) || 1));
    return { nom:v("nom").trim(), tues:Math.max(0, Math.min(total, parseInt(v("tues"), 10) || 0)), total, mention:v("mention").trim(), note:v("note").trim() };
  });
}
function afficherOnglet(p){
  ongletAdmin = p;
  document.querySelectorAll(".onglets-admin button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === p));
  $("#panneau-site").hidden = p !== "site";
  $("#panneau-raids").hidden = p !== "raids";
  $("#panneau-membres").hidden = p !== "membres";
  if(!estOfficier()) return;
  if(p === "site"){ $("#a-retour").innerHTML = ""; remplirAdmin(etat); }
  if(p === "raids"){ $("#c-retour").innerHTML = ""; chargerAdminCal(); }
  if(p === "membres"){ $("#m-retour").innerHTML = ""; chargerMembres(); }
}
document.querySelectorAll(".onglets-admin button").forEach(b => b.onclick = () => afficherOnglet(b.dataset.p));
function majAdminAcces(){
  const off = estOfficier();
  $("#admin-gate").hidden = off; $("#admin-contenu").hidden = !off;
  if(off && adm.open) afficherOnglet(ongletAdmin);
}
document.querySelectorAll(".js-ouvrir-auth").forEach(b => b.onclick = () => ouvrirAuth("connexion"));
$("#ouvrir-admin").onclick = () => { adm.showModal(); ongletAdmin = "site"; majAdminAcces(); };
$("#admin-fermer").onclick = () => adm.close();
adm.addEventListener("click", e => { if(e.target === adm) adm.close(); });

/* ----- Annonce, recrutement, progression ----- */
$("#a-ajout").onclick = () => dessinerChampsRaids([...lireRaids(), { nom:"", tues:0, total:10, mention:"", note:"" }]);
$("#a-raids").addEventListener("click", e => {
  const i = e.target.dataset?.sup;
  if(i === undefined) return;
  dessinerChampsRaids(lireRaids().filter((_, k) => k !== +i));
});
$("#a-sauver").onclick = async () => {
  const retour = $("#a-retour"), data = lireAdmin();
  data.raids = data.raids.filter(r => r.nom);
  retour.innerHTML = '<div class="msg">Enregistrement…</div>';
  const r = await appel("site", { data });
  if(r.ok){
    appliquer(data); signaler("site"); dessinerChampsRaids(etat.raids);
    retour.innerHTML = '<div class="msg">Modifications publiées : elles sont visibles par tous les visiteurs.</div>';
  }else{
    if(r.statut === 401 || r.statut === 403) await majSession();
    retour.innerHTML = erreurHtml(r);
  }
};

/* ----- Calendrier et roster ----- */
async function chargerAdminCal(){
  const r = await appel("raids?tout=1");
  if(!r.ok){ $("#c-retour").innerHTML = erreurHtml(r); return; }
  adminEvts = r.raids.map(adapter); dessinerAdminCal();
}
async function actionCal(corps){
  const r = await appel("raids", corps);
  if(!r.ok){ $("#c-retour").innerHTML = erreurHtml(r); return false; }
  $("#c-retour").innerHTML = "";
  await chargerAdminCal(); signaler("calendrier");
  return true;
}
const opts = (liste, v) => liste.map(([k, t]) => `<option value="${k}"${v === k ? " selected" : ""}>${t}</option>`).join("");
function dessinerAdminCal(){
  const tri = [...adminEvts].sort((a, b) => debutDe(a) - debutDe(b));
  $("#a-cal").innerHTML = tri.map(r => `
    <div class="a-evt${r.archive ? " archive" : ""}">
      <div class="a-evt-tete"><strong>${esc(r.titre)}</strong><span>${esc(r.date)} · ${esc(r.rassemblement)} / ${esc(r.debut)}${r.archive ? " · archivé" : ""}</span>
        <select data-statut="${esc(r.id)}" aria-label="Statut du raid">${opts([["ouvert","Ouvert aux inscriptions"],["complet","Complet"],["annule","Annulé"]], r.statut)}</select>
        <button class="btn btn-ligne petit" type="button" data-archiver="${esc(r.id)}" data-val="${r.archive ? "0" : "1"}">${r.archive ? "Restaurer" : "Archiver"}</button>
        <button class="btn btn-ligne petit" type="button" data-suppr="${esc(r.id)}">Supprimer</button></div>
      <div class="a-ins">${r.inscriptions.map(i => `
        <div class="a-ligne" style="--cl:${couleurDe(i.classe)}">
          <span class="a-nom"><b>${esc(i.pseudo)}</b> <small>${ROLE_ICONE[i.role] || ""} ${esc(i.spe)} ${esc(i.classe)} · ${esc(i.joueur)}</small></span>
          <span class="a-pres">${PRES[i.presence] || ""}${i.heure ? " " + esc(i.heure) : ""}${i.note ? " · " + esc(i.note) : ""}</span>
          <select data-etat="${esc(i.id)}" aria-label="Validation du roster pour ${esc(i.pseudo)}">${opts([["attente","En attente"],["confirme","Confirmé"],["remplacant","Remplaçant"]], i.etat)}</select>
          <button class="x" type="button" data-retirer-adm="${esc(i.id)}" aria-label="Retirer ${esc(i.pseudo)}">✕</button>
        </div>`).join("") || "<small>Aucune inscription pour le moment.</small>"}</div>
    </div>`).join("") || '<p class="intro">Aucun raid pour le moment.</p>';
}
$("#a-cal").addEventListener("change", e => {
  const t = e.target;
  if(t.dataset.statut) actionCal({ action:"statut", raidId:t.dataset.statut, statut:t.value });
  else if(t.dataset.etat) actionCal({ action:"etat", inscriptionId:t.dataset.etat, etat:t.value });
});
$("#a-cal").addEventListener("click", e => {
  const b = e.target.closest("button");
  if(!b) return;
  const d = b.dataset;
  if(d.archiver) actionCal({ action:"archiver", raidId:d.archiver, archive:d.val === "1" });
  else if(d.suppr){ if(confirm("Supprimer définitivement ce raid et toutes ses inscriptions ?")) actionCal({ action:"supprimer", raidId:d.suppr }); }
  else if(d.retirerAdm){ if(confirm("Retirer cette inscription ?")) actionCal({ action:"retirer", inscriptionId:d.retirerAdm }); }
});
$("#f-raid").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => $("#" + id).value.trim();
  const ok = await actionCal({ action:"creer", raid:{ titre:v("c-titre"), date:v("c-date"), rassemblement:v("c-rass"), debut:v("c-debut"),
    description:v("c-desc"), tank:v("c-tank"), soigneur:v("c-heal"), dps:v("c-dps") } });
  if(ok){ e.target.reset(); $("#c-retour").innerHTML = '<div class="msg">Raid créé : les membres le voient dans le calendrier.</div>'; }
});

/* ----- Membres : validation des comptes, mots de passe temporaires ----- */
async function chargerMembres(){
  const r = await appel("membres");
  if(!r.ok){ $("#m-retour").innerHTML = erreurHtml(r); return; }
  membresAdmin = r.membres; dessinerMembres();
}
function dessinerMembres(){
  const ordre = { en_attente:0, membre:1, officier:2, refuse:3 };
  const tri = [...membresAdmin].sort((a, b) => ordre[a.role] - ordre[b.role] || a.pseudo.localeCompare(b.pseudo));
  const attente = membresAdmin.filter(m => m.role === "en_attente").length;
  $("#compteur-membres").textContent = attente ? ` (${attente})` : "";
  $("#a-membres").innerHTML = tri.map(m => `
    <div class="a-ligne${m.role === "en_attente" ? " attente" : ""}">
      <span class="a-nom"><b>${esc(m.pseudo)}</b>${m.email_verifie ? "" : ' <em class="pastille">e-mail non confirmé</em>'} <small>${esc(m.email)} · inscrit le ${esc(new Date(m.cree_le * 1000).toLocaleDateString("fr-FR"))}</small></span>
      <select data-membre="${esc(m.id)}" aria-label="Rôle de ${esc(m.pseudo)}">${opts([["en_attente","Sans accès"],["membre","Membre"],["officier","Officier"],["refuse","Refusé"]], m.role)}</select>
      ${m.email_verifie ? "" : `<button class="btn btn-ligne petit" type="button" data-verif="${esc(m.id)}">Confirmer l’e-mail</button>`}
      <button class="btn btn-ligne petit" type="button" data-reinit="${esc(m.id)}">Mot de passe temporaire</button>
      <button class="x" type="button" data-suppr-membre="${esc(m.id)}" aria-label="Supprimer le compte de ${esc(m.pseudo)}">✕</button>
    </div>`).join("") || '<p class="intro">Aucun compte pour le moment.</p>';
}
$("#a-membres").addEventListener("change", async e => {
  const id = e.target.dataset.membre;
  if(!id) return;
  if(id === profil.id && e.target.value !== "officier" && !confirm("Vous allez retirer vos propres droits d’officier. Continuer ?")){ dessinerMembres(); return; }
  const r = await appel("membres", { action:"role", membreId:id, role:e.target.value });
  if(!r.ok) $("#m-retour").innerHTML = erreurHtml(r); else $("#m-retour").innerHTML = "";
  await chargerMembres();
  if(id === profil.id) await majSession();
});
$("#a-membres").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b) return;
  const zone = $("#m-retour");
  if(b.dataset.verif){
    if(!confirm("Confirmer à la main l’adresse e-mail de ce membre ? Son compte deviendra immédiatement actif.")) return;
    const r = await appel("membres", { action:"verifier", membreId:b.dataset.verif });
    zone.innerHTML = r.ok ? '<div class="msg">Adresse confirmée : le membre peut se connecter.</div>' : erreurHtml(r);
    if(r.ok) chargerMembres();
  }else if(b.dataset.reinit){
    if(!confirm("Générer un mot de passe temporaire ? L’ancien mot de passe ne fonctionnera plus et le membre sera déconnecté.")) return;
    const r = await appel("membres", { action:"reinitialiser", membreId:b.dataset.reinit });
    zone.innerHTML = r.ok ? `<div class="msg">Mot de passe temporaire de <b>${esc(r.pseudo)}</b> : <code class="mdp-temp">${esc(r.motDePasse)}</code><br>Transmettez-le-lui en message privé : il ne sera plus affiché, et le membre devra en choisir un nouveau à sa prochaine connexion.</div>` : erreurHtml(r);
  }else if(b.dataset.supprMembre){
    if(!confirm("Supprimer ce compte, ses personnages et ses inscriptions ? Cette action est définitive.")) return;
    const r = await appel("membres", { action:"supprimer", membreId:b.dataset.supprMembre });
    zone.innerHTML = r.ok ? "" : erreurHtml(r);
    if(r.ok) chargerMembres();
  }
});
