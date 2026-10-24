/* verify.js : page ouverte par le lien reçu par e-mail (/verify?token=...) */
(async () => {
  const zone = $("#verif");
  const jeton = new URLSearchParams(location.search).get("token") || "";
  if(history.replaceState) history.replaceState(null, "", location.pathname);   // le jeton ne reste pas dans la barre d'adresse
  const echec = message => {
    zone.innerHTML = `<div class="verif-carte erreur"><h2>Lien non valide</h2><p>${esc(message)}</p><button type="button" class="btn btn-or" id="v-connexion">Se connecter</button></div>`;
    $("#v-connexion").onclick = () => ouvrirAuth("connexion");
  };
  if(!jeton){ echec("Ce lien est incomplet. Ouvrez-le depuis le message reçu par e-mail."); return; }
  const r = await appel("auth/verifier", { token:jeton });
  if(!r.ok){ echec(messageErreur(r)); return; }
  zone.innerHTML = `<div class="verif-carte ok"><h2>Votre compte est validé !</h2><p>Vous pouvez désormais vous connecter.</p><button type="button" class="btn btn-or" id="v-connexion">Se connecter</button></div>`;
  $("#v-connexion").onclick = () => ouvrirAuth("connexion");
  ouvrirAuth("connexion");
})();
