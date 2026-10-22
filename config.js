/* =====================================================================
   config.js : VOS RÉGLAGES. C'est le seul fichier à modifier pour changer le lien Discord,
   la chaîne Twitch, la musique ou les clés Supabase.
   ===================================================================== */
/* ============================================================
   ZONE À MODIFIER : tout ce qui change se trouve ici
   ============================================================ */

// 1. Votre lien d’invitation Discord
const LIEN_DISCORD = "https://discord.com/invite/ks68MWK756";

// 1 bis. Hymne de la guilde : chemin du fichier MP3, volume de départ (0 à 1)
//        et tentative de lancement automatique (true / false)
const FICHIER_HYMNE = "hymne-legion.mp3";
const VOLUME_DEPART = 0.4;
const LANCER_AUTO   = true;

// 1 ter. Twitch : le nom de votre chaîne (ce qui suit twitch.tv/ dans l'adresse)
//        et l'affichage du tchat à côté du lecteur sur grand écran (true / false).
//        (Si vous remplacez le nom par « ton_pseudo_twitch », tous les éléments Twitch disparaissent.)
const TWITCH_CHANNEL_NAME = "lugasam";
const TWITCH_CHAT = true;

// 1 quater. Comptes membres (Supabase) : l'adresse de votre projet et sa clé PUBLIQUE (voir le guide).
//           Cette clé est faite pour être visible : la sécurité est assurée par les règles de la base de données.
//           Tant que ces deux lignes sont vides, les comptes membres restent désactivés.
const SUPABASE_URL = "https://zhjqzjfcpjspowqlcbdx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dQSGAcOEP2Iz7bvgKubV7Q_LEQ3H_3C";

// 2. Besoins de recrutement (valeurs de départ : ensuite gérées depuis l’Espace Officier)
//    statut : "ouvert", "ferme" ou "prio"   |   note : texte libre
const CLASSES = [
  { nom:"Guerrier",           couleur:"#C79C6E", statut:"ouvert", note:"Tank principal bienvenu",
    specs:["Armes","Fureur","Protection"] },
  { nom:"Paladin",            couleur:"#F58CBA", statut:"prio",   note:"Soigneurs recherchés",
    specs:["Sacré","Protection","Vindicte"] },
  { nom:"Chasseur",           couleur:"#ABD473", statut:"ferme",  note:"Effectif complet",
    specs:["Maîtrise des bêtes","Précision","Survie"] },
  { nom:"Voleur",             couleur:"#FFF569", statut:"ouvert", note:"Dégâts au corps à corps",
    specs:["Assassinat","Combat","Finesse"] },
  { nom:"Prêtre",             couleur:"#FFFFFF", statut:"prio",   note:"Soigneurs recherchés",
    specs:["Discipline","Sacré","Ombre"] },
  { nom:"Chamane",            couleur:"#4C8CF0", statut:"ouvert", note:"Soutien et soins",
    specs:["Élémentaire","Amélioration","Restauration"] },
  { nom:"Mage",               couleur:"#69CCF0", statut:"ferme",  note:"Effectif complet",
    specs:["Arcanes","Feu","Givre"] },
  { nom:"Démoniste",          couleur:"#9482C9", statut:"ouvert", note:"Dégâts à distance",
    specs:["Affliction","Démonologie","Destruction"] },
  { nom:"Druide",             couleur:"#FF7D0A", statut:"prio",   note:"Soigneur ou tank",
    specs:["Équilibre","Combat farouche","Restauration"] }
];

// 3. Progression des raids (valeurs de départ : ensuite gérées depuis l’Espace Officier)
const RAIDS = [
  { nom:"Cœur du Magma",        tues:7, total:10, note:"En cours, fin de raid en vue." },
  { nom:"Repaire de l’Aile noire", tues:3, total:8, note:"Les premiers boss tombent." },
  { nom:"Onyxia",               tues:1, total:1,  note:"Vaincue" }
];

/* ============================================================
   Fin de la zone à modifier
   ============================================================ */
