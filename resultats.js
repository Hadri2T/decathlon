// ==================== RÉSULTATS : DU GOOGLE SHEET AUX CLASSEMENTS ====================
// Ce fichier lit les résultats dans le Google Sheet, calcule les classements
// et les affiche dans les pages Classements. Il relit le Sheet toutes les 30 secondes.


// ---------- 1. RÉGLAGES ----------

// Identifiant du Google Sheet : la partie de son adresse entre /d/ et /edit
const ID_SHEET = "14S14W9K3l50Kc2q0kQhhgOnPYQNC69v2joXZUYqiwsw";

// Onglets du Sheet lus par le site
const ONGLETS = ["participants", "100m", "800m", "longueur", "poids", "relais"];

// Fréquence de mise à jour : toutes les 30 secondes (en millisecondes)
const FREQUENCE_MAJ = 30 * 1000;

// Dernières données lues dans le Sheet (null tant que rien n'est chargé)
let donnees = null;
let heureMaj = "";


// ---------- 2. LECTURE DU GOOGLE SHEET ----------

// Lit un onglet et renvoie ses lignes sous forme d'objets, par exemple :
// [{ dossard: "1", prénom: "Camille", nom: "Martin", genre: "F", photo: "" }, ...]
async function lireOnglet(nomOnglet) {
  // Adresse qui renvoie l'onglet au format CSV (un tableau en texte)
  const adresse = `https://docs.google.com/spreadsheets/d/${ID_SHEET}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(nomOnglet)}`;

  const reponse = await fetch(adresse);
  const texte = await reponse.text();

  // Si Google renvoie une page web au lieu d'un tableau, le Sheet n'est pas lisible
  if (!reponse.ok || texte.trim().startsWith("<")) {
    throw new Error("Onglet illisible : " + nomOnglet);
  }

  // Google renvoie une ligne par rangée, chaque case entre guillemets :
  //   "dossard","prénom","nom"
  //   "1","Camille","Martin"
  // On enlève les guillemets des deux bords, puis on découpe sur ","
  const rangees = texte.trim().split("\n").map(function (ligne) {
    return ligne.trim().slice(1, -1).split('","');
  });

  // La 1re rangée contient les titres des colonnes : ils servent de noms aux champs
  const titres = rangees.shift();
  const lignes = rangees.map(function (cases) {
    const ligne = {};
    titres.forEach(function (titre, i) {
      ligne[titre] = cases[i] || "";
    });
    return ligne;
  });

  // On ignore les lignes dont la 1re case est vide (lignes pas encore remplies)
  return lignes.filter(ligne => ligne[titres[0]] !== "");
}

// Lit tous les onglets en même temps et renvoie { participants: [...], "100m": [...], ... }
async function chargerDonnees() {
  const tableaux = await Promise.all(ONGLETS.map(lireOnglet));
  const resultat = {};
  ONGLETS.forEach(function (nom, i) {
    resultat[nom] = tableaux[i];
  });
  return resultat;
}


// ---------- 3. CONVERSION DES RÉSULTATS ----------
// Dans le Sheet, les résultats sont du texte (« 12,85 », « 2:41,35 », « X »).
// Pour les comparer, on les transforme en nombres, puis on les remet en texte pour l'affichage.

// "12,85" → 12.85   "2:41,35" → 161.35 (secondes)   "4,35" → 4.35   "X" ou "" → null
function enNombre(texte) {
  texte = (texte || "").trim().replace(",", ".");
  if (texte === "") return null;

  let nombre;
  if (texte.includes(":")) {
    const [minutes, secondes] = texte.split(":");
    nombre = Number(minutes) * 60 + Number(secondes);
  } else {
    nombre = Number(texte);
  }
  return isNaN(nombre) ? null : nombre;   // "X" n'est pas un nombre → pas de résultat
}

// 14.72 → "14,72"   161.35 → "2:41,35"
function formaterTemps(secondes) {
  const centiemes = Math.round(secondes * 100);
  const minutes = Math.floor(centiemes / 6000);
  const reste = ((centiemes % 6000) / 100).toFixed(2).replace(".", ",");
  return minutes === 0 ? reste : minutes + ":" + reste.padStart(5, "0");
}

// 4.3 → "4,30 m"
function formaterDistance(metres) {
  return metres.toFixed(2).replace(".", ",") + " m";
}

// Évite qu'un texte du Sheet contenant < ou > soit pris pour du code et casse la page
function echapper(texte) {
  return String(texte).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


// ---------- 4. CALCUL DES CLASSEMENTS ----------
// Chaque épreuve est transformée en une liste de lignes de la forme :
//   { nom: "Camille Martin", genre: "F", detail: "Série 1", perf: 14.72 }
// ⚠️ Règles provisoires : simple tri par performance, en attendant les règles
//    des organisateurs (ex. 100 m : vainqueurs de série d'abord ?).

// Retrouve un participant à partir de son numéro de dossard
function trouverParticipant(dossard) {
  return donnees.participants.find(p => p.dossard === dossard);
}

// "Camille Martin", ou "Dossard 23" si ce numéro n'est pas dans l'onglet participants
function nomDuDossard(dossard) {
  const participant = trouverParticipant(dossard);
  return participant ? participant["prénom"] + " " + participant.nom : "Dossard " + dossard;
}

// Courses (100 m, 800 m) : la performance est le temps
function lignesCourse(onglet) {
  return donnees[onglet].map(function (ligne) {
    const participant = trouverParticipant(ligne.dossard);
    return {
      nom: nomDuDossard(ligne.dossard),
      genre: participant ? participant.genre : "",
      detail: ligne["série"] ? "Série " + ligne["série"] : "",
      perf: enNombre(ligne.temps),
    };
  });
}

// Concours (longueur, poids) : la performance est le meilleur des 3 essais
function lignesConcours(onglet) {
  return donnees[onglet].map(function (ligne) {
    const participant = trouverParticipant(ligne.dossard);
    const essais = [ligne["essai 1"], ligne["essai 2"], ligne["essai 3"]];
    const distances = essais.map(enNombre).filter(d => d !== null);   // enlève les X et les cases vides
    return {
      nom: nomDuDossard(ligne.dossard),
      genre: participant ? participant.genre : "",
      detail: essais.map(e => e || "–").join(" · "),                   // ex. « 3,60 · X · 3,55 »
      perf: distances.length > 0 ? Math.max(...distances) : null,
    };
  });
}

// Relais : une ligne par équipe, la performance est le temps de l'équipe
function lignesRelais() {
  return donnees.relais.map(function (equipe) {
    const coureurs = [equipe["coureur 1"], equipe["coureur 2"], equipe["coureur 3"], equipe["coureur 4"]];
    return {
      nom: "Équipe " + equipe["équipe"],
      genre: "",
      detail: coureurs.filter(d => d !== "").map(nomDuDossard).join(" · "),
      perf: enNombre(equipe.temps),
    };
  });
}

// Trie les lignes et leur attribue un rang.
// plusPetitGagne : true pour un temps (le plus petit gagne), false pour une distance.
function classer(lignes, plusPetitGagne) {
  const avecPerf = lignes.filter(l => l.perf !== null);
  const sansPerf = lignes.filter(l => l.perf === null);

  avecPerf.sort(function (a, b) {
    return plusPetitGagne ? a.perf - b.perf : b.perf - a.perf;
  });

  // Deux performances égales ont le même rang (ex. 3e, 3e, puis 5e)
  avecPerf.forEach(function (ligne, i) {
    const precedente = avecPerf[i - 1];
    ligne.rang = precedente && precedente.perf === ligne.perf ? precedente.rang : i + 1;
  });

  // Ceux qui n'ont pas (encore) de résultat sont affichés à la fin, sans rang
  return avecPerf.concat(sansPerf);
}


// ---------- 5. AFFICHAGE ----------

// Écrit le tableau d'un classement dans son conteneur
function afficherTableau(conteneur, lignes, formater) {
  if (lignes.length === 0) {
    conteneur.innerHTML = '<p class="vide">Pas encore de résultats.</p>';
    return;
  }

  let html = '<table class="tableau">';
  lignes.forEach(function (ligne) {
    html += `
      <tr>
        <td class="rang">${ligne.rang || "–"}</td>
        <td>${echapper(ligne.nom)}<span class="detail">${echapper(ligne.detail)}</span></td>
        <td class="perf">${ligne.perf !== null ? formater(ligne.perf) : "–"}</td>
      </tr>`;
  });
  html += "</table>";
  html += `<p class="maj">Mis à jour à ${heureMaj}</p>`;
  conteneur.innerHTML = html;
}

// Affiche le classement d'une épreuve en tenant compte du filtre Mixte / Femmes / Hommes
function afficherEpreuve(epreuve, lignes, plusPetitGagne, formater) {
  const page = document.getElementById("classement-" + epreuve);

  // Genre du bouton sélectionné : "" (mixte), "F" ou "H". Le relais n'a pas de filtre.
  const boutonActif = page.querySelector(".filtres .actif");
  const genre = boutonActif ? boutonActif.dataset.genre : "";
  if (genre) {
    lignes = lignes.filter(ligne => ligne.genre === genre);
  }

  afficherTableau(page.querySelector(".resultats"), classer(lignes, plusPetitGagne), formater);
}

// Affiche tous les classements (le général attend son barème de points)
function afficherClassements() {
  if (!donnees) return;   // rien n'est encore chargé
  afficherEpreuve("100m", lignesCourse("100m"), true, formaterTemps);
  afficherEpreuve("800m", lignesCourse("800m"), true, formaterTemps);
  afficherEpreuve("longueur", lignesConcours("longueur"), false, formaterDistance);
  afficherEpreuve("poids", lignesConcours("poids"), false, formaterDistance);
  afficherEpreuve("relais", lignesRelais(), true, formaterTemps);
}

// Message affiché si le Sheet n'a jamais pu être lu
function afficherErreur() {
  // Cas fréquent en test : le site ouvert comme un simple fichier (double-clic)
  const message = location.protocol === "file:"
    ? "Les résultats ne se chargent pas quand le site est ouvert comme un simple fichier : lance-le avec un serveur local (voir le README)."
    : "Impossible de charger les résultats pour le moment. Vérifie ta connexion internet.";
  document.querySelectorAll(".resultats").forEach(function (conteneur) {
    conteneur.innerHTML = `<p class="vide">${message}</p>`;
  });
}


// ---------- 6. FILTRES MIXTE / FEMMES / HOMMES ----------

document.querySelectorAll(".filtres button").forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    // On désélectionne les boutons voisins, on sélectionne celui qui a été cliqué…
    bouton.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("actif"));
    bouton.classList.add("actif");
    // … et on réaffiche les classements avec ce filtre
    afficherClassements();
  });
});


// ---------- 7. MISE À JOUR AUTOMATIQUE ----------

async function mettreAJour() {
  try {
    donnees = await chargerDonnees();
    heureMaj = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    afficherClassements();
  } catch (erreur) {
    console.error(erreur);
    // Si des résultats sont déjà affichés, on les garde ; sinon on prévient
    if (!donnees) afficherErreur();
  }
}

mettreAJour();                             // au chargement du site
setInterval(mettreAJour, FREQUENCE_MAJ);   // puis toutes les 30 secondes
