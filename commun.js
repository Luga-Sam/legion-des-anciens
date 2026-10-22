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

    // On récupère le texte brut d'abord pour éviter les plantages si le serveur renvoie du HTML
    const texteReponse = await res.text();
    let data;
    try {
      data = JSON.parse(texteReponse);
    } catch {
      throw new Error("Erreur du serveur (le serveur a renvoyé du HTML au lieu de JSON). Vérifiez la base de données D1 sur Cloudflare.");
    }

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
