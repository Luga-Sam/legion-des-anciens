/* calendrier.js : planning des raids et inscriptions (réservé aux membres validés) */
let evts = [], evtCourant = "";

document.addEventListener("legion:session", () => {
  if(estMembre()) chargerCal(); else { evts = []; dessinerCal(); }
});
document.addEventListener("legion:calendrier", planifierCal);

let tempoCal;
function planifierCal(){ clearTimeout(tempoCal); tempoCal = setTimeout(chargerCal, 400); }
async function chargerCal(){
  if(!estMembre()) return;
  const r = await appel("raids");
  if(!r.ok) return;
  evts = r.raids.map(adapter);
  dessinerCal();
}
function carteRaid(r){
  const ins = r.inscriptions || [], moi = profil?.id;
  const actif = i => i.presence !== "absent" && i.etat !== "remplacant";
  const ligne = i => `<li style="--cl:${couleurDe(i.classe)}"><button type="button" class="lien-perso" data-perso="${esc(i.persoId)}">${esc(i.pseudo)}</button><small>${esc(i.spe)} ${esc(i.classe)}</small>`
    + (i.presence === "retard" ? `<em class="pastille">En retard${i.heure ? " " + esc(i.heure) : ""}</em>` : "")
    + (i.etat === "confirme" ? '<em class="pastille ok">Confirmé</em>' : "")
    + (i.joueur ? `<small>· ${esc(i.joueur)}</small>` : "")
    + (i.note ? `<small class="note-i">« ${esc(i.note)} »</small>` : "")
    + (i.membreId === moi ? `<button type="button" class="x" data-retirer="${esc(i.id)}" aria-label="Retirer mon inscription">✕</button>` : "")
    + "</li>";
  let total = 0, pleins = true;
  const blocs = ["tank", "soigneur", "dps"].map(k => {
    const need = r.compo[k];
    const liste = ins.filter(i => i.role === k && actif(i)).sort((a, b) => (b.etat === "confirme") - (a.etat === "confirme"));
    total += need; if(liste.length < need) pleins = false;
    const reste = Math.max(0, need - liste.length);
    const etat = reste ? `${reste} place${reste > 1 ? "s" : ""} restante${reste > 1 ? "s" : ""}` : "Complet";
    return `<div class="role role-${k}"><div class="role-tete">${ROLE_ICONE[k]} ${ROLE_PLURIEL[k]}<span>${liste.length}/${need} · ${etat}</span></div>
      <ul class="inscrits">${liste.map(ligne).join("") || "<li><small>Personne pour le moment</small></li>"}</ul></div>`;
  }).join("");
  const aux = (titre, l) => l.length ? `<div class="role role-aux"><div class="role-tete">${titre}<span>${l.length}</span></div><ul class="inscrits">${l.map(ligne).join("")}</ul></div>` : "";
  let st = r.statut;
  if(st === "ouvert" && total && pleins) st = "complet";
  const compo = ["tank", "soigneur", "dps"].map(k => `<span class="puce role-${k}">${ROLE_ICONE[k]} ${r.compo[k]} ${r.compo[k] > 1 ? ROLE_PLURIEL[k] : ROLE_LIBELLE[k]}</span>`).join("");
  return `<article class="evt ${st}"><div class="evt-tete"><div><h3>${esc(r.titre)}</h3>
    <div class="quand">${esc(maj(jourFmt.format(debutDe(r))))} <small>· Rassemblement ${esc(r.rassemblement)} · Début ${esc(r.debut)}</small></div></div>
    <span class="etiq et-${st}">${ETIQ[st]}</span></div>
    ${r.description ? `<p>${esc(r.description)}</p>` : ""}
    <div class="compo" aria-label="Composition souhaitée">${compo}</div>
    <div class="roles">${blocs}${aux("Remplaçants", ins.filter(i => i.etat === "remplacant" && i.presence !== "absent"))}${aux("Absents", ins.filter(i => i.presence === "absent"))}</div>
    ${st === "annule" ? "" : `<button class="btn btn-or petit" type="button" data-ins="${esc(r.id)}">${st === "complet" ? "S’inscrire (liste d’attente)" : "S’inscrire avec mon personnage"}</button>`}</article>`;
}
function dessinerCal(){
  const a = acces(), el = $("#cal");
  if(!sessionPrete){ el.innerHTML = '<p class="intro">Chargement…</p>'; return; }
  if(!estMembre()){
    if(a === "en_attente") el.innerHTML = verrou("Votre compte n’a pas accès à cette section pour le moment. Contactez un officier sur notre Discord.");
    else if(a === "refuse") el.innerHTML = verrou("Votre demande d’accès n’a pas été acceptée. Contactez un officier sur notre Discord.");
    else el.innerHTML = verrou("Cette section est réservée aux membres de La Légion des Anciens. Veuillez vous connecter ou créer un compte.",
      '<div class="actions"><button type="button" class="btn btn-or" data-auth="connexion">Se connecter</button><button type="button" class="btn btn-ligne" data-auth="inscription">Créer un compte</button></div>');
    return;
  }
  const l = evts.filter(r => debutDe(r).getTime() > Date.now() - 6 * 3600e3).sort((a, b) => debutDe(a) - debutDe(b));
  el.innerHTML = l.map(carteRaid).join("") || '<p class="intro">Aucun raid planifié pour le moment. Les prochaines dates seront annoncées ici et sur notre Discord.</p>';
}
setInterval(() => { if(document.visibilityState === "visible" && estMembre()) chargerCal(); }, 60000);
dessinerCal();

const dIns = $("#inscription");
function remplirInscription(){
  const sel = $("#i-perso");
  sel.innerHTML = mesPersos.map(p => `<option value="${esc(p.id)}">${esc(p.nom)} · ${esc(p.classe)} ${esc(p.specialisation)} (niv. ${+p.niveau})</option>`).join("");
  $("#ins-sans-perso").hidden = mesPersos.length > 0;
  $("#ins-champs").hidden = mesPersos.length === 0;
  prefillInscription();
}
function prefillInscription(){
  const p = mesPersos.find(x => x.id === $("#i-perso").value);
  if(!p) return;
  const deja = (evts.find(r => r.id === evtCourant)?.inscriptions || []).find(i => i.persoId === p.id);
  $("#i-role").value = deja ? deja.role : p.role;
  $("#i-presence").value = deja ? deja.presence : "present";
  $("#i-heure").value = deja ? deja.heure : "";
  $("#i-note").value = deja ? deja.note : "";
  $("#i-heure-bloc").hidden = $("#i-presence").value !== "retard";
}
$("#i-perso").onchange = prefillInscription;
$("#i-presence").onchange = e => { $("#i-heure-bloc").hidden = e.target.value !== "retard"; };
$("#ins-fermer").onclick = () => dIns.close();
dIns.addEventListener("click", e => { if(e.target === dIns) dIns.close(); });
$("#ins-creer").onclick = () => { dIns.close(); ouvrirPerso(null); };

$("#cal").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b) return;
  if(b.dataset.auth) ouvrirAuth(b.dataset.auth);
  else if(b.dataset.ins){
    evtCourant = b.dataset.ins;
    const r = evts.find(x => x.id === evtCourant);
    $("#ins-titre").textContent = "S’inscrire : " + (r ? r.titre : "raid");
    $("#ins-retour").innerHTML = "";
    remplirInscription();
    dIns.showModal();
  }else if(b.dataset.retirer){
    if(!confirm("Retirer cette inscription ?")) return;
    const r = await appel("raids", { action:"retirer", inscriptionId:b.dataset.retirer });
    if(!r.ok) alert(messageErreur(r)); else chargerCal();
  }else if(b.dataset.perso){
    const p = persoConnus[b.dataset.perso];
    if(!p) return;
    $("#fiche-carte").innerHTML = carteDe(p);
    $("#dlg-fiche").showModal();
  }
});
$("#f-ins").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => $("#" + id).value.trim(), bouton = e.target.querySelector("button[type=submit]"), retour = $("#ins-retour");
  const presence = v("i-presence");
  bouton.disabled = true; bouton.textContent = "Envoi…";
  const r = await appel("raids", { action:"inscrire", raidId:evtCourant, persoId:v("i-perso"), role:v("i-role"), presence, heure:v("i-heure"), note:v("i-note") });
  bouton.disabled = false; bouton.textContent = "Valider mon inscription";
  if(!r.ok){ retour.innerHTML = erreurHtml(r); return; }
  dIns.close(); chargerCal();
});

