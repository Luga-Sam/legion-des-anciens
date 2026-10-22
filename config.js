/* =====================================================================
   config.js : VOS RÉGLAGES
   ===================================================================== */
const LIEN_DISCORD = "https://discord.com/invite/ks68MWK756";

const FICHIER_HYMNE = "hymne-legion.mp3";
const VOLUME_DEPART = 0.4;
const LANCER_AUTO   = true;

const TWITCH_CHANNEL_NAME = "lugasam";
const TWITCH_CHAT = true;

// Les identifiants Supabase ne sont plus nécessaires, tout passe par Cloudflare !

const CLASSES = [
  { nom:"Guerrier",           couleur:"#C79C6E", statut:"ouvert", note:"Tank principal bienvenu", specs:["Armes","Fureur","Protection"] },
  { nom:"Paladin",            couleur:"#F58CBA", statut:"prio",   note:"Soigneurs recherchés", specs:["Sacré","Protection","Vindicte"] },
  { nom:"Chasseur",           couleur:"#ABD473", statut:"ferme",  note:"Effectif complet", specs:["Maîtrise des bêtes","Précision","Survie"] },
  { nom:"Voleur",             couleur:"#FFF569", statut:"ouvert", note:"Dégâts au corps à corps", specs:["Assassinat","Combat","Finesse"] },
  { nom:"Prêtre",             couleur:"#FFFFFF", statut:"prio",   note:"Soigneurs recherchés", specs:["Discipline","Sacré","Ombre"] },
  { nom:"Chamane",            couleur:"#4C8CF0", statut:"ouvert", note:"Soutien et soins", specs:["Élémentaire","Amélioration","Restauration"] },
  { nom:"Mage",               couleur:"#69CCF0", statut:"ferme",  note:"Effectif complet", specs:["Arcanes","Feu","Givre"] },
  { nom:"Démoniste",          couleur:"#9482C9", statut:"ouvert", note:"Dégâts à distance", specs:["Affliction","Démonologie","Destruction"] },
  { nom:"Druide",             couleur:"#FF7D0A", statut:"prio",   note:"Soigneur ou tank", specs:["Équilibre","Combat farouche","Restauration"] }
];

const RAIDS = [
  { nom:"Cœur du Magma",        tues:7, total:10, note:"En cours, fin de raid en vue." },
  { nom:"Repaire de l’Aile noire", tues:3, total:8, note:"Les premiers boss tombent." },
  { nom:"Onyxia",               tues:1, total:1,  note:"Vaincue" }
];
