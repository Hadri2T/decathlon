// ==================== RÉSULTATS : DU GOOGLE SHEET AUX PAGES DU SITE ====================
// Ce fichier lit les données du Google Sheet, puis remplit les pages Classements,
// Participants et Profil. Il relit le Sheet toutes les 30 secondes.


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

  // La 1re rangée contient les titres des colonnes : ils servent de noms aux champs.
  // On les met en minuscules : « Surnom » ou « surnom » dans le Sheet, c'est pareil.
  const titres = rangees.shift().map(titre => titre.trim().toLowerCase());
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

// 1 → "1er" (ou "1re" au féminin), 2 → "2e", …
function ordinal(nombre, feminin) {
  if (nombre === 1) return feminin ? "1re" : "1er";
  return nombre + "e";
}

// Évite qu'un texte du Sheet contenant < > " soit pris pour du code et casse la page
function echapper(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ---------- 4. PARTICIPANTS ET PHOTOS ----------

// Retrouve un participant à partir de son numéro de dossard
function trouverParticipant(dossard) {
  return donnees.participants.find(p => p.dossard === dossard);
}

// Nom affiché partout sur le site : Prénom "Surnom" Nom
// (ou Prénom Nom quand la case surnom est vide)
function nomComplet(participant) {
  const surnom = (participant.surnom || "").trim();
  return participant["prénom"] + (surnom ? ` "${surnom}" ` : " ") + participant.nom;
}

// Nom à partir du dossard, ou "Dossard 23" si ce numéro n'est pas dans l'onglet participants
function nomDuDossard(dossard) {
  const participant = trouverParticipant(dossard);
  return participant ? nomComplet(participant) : "Dossard " + dossard;
}

// Transforme le lien Google Drive collé dans le Sheet
// (ex. https://drive.google.com/file/d/1AbC…/view?usp=sharing)
// en adresse d'image affichable. Renvoie "" s'il n'y a pas de photo.
function adressePhoto(lien) {
  lien = (lien || "").trim();
  // On récupère l'identifiant du fichier : ce qui suit « /d/ » ou « id= »
  const trouve = lien.match(/\/d\/([\w-]+)/) || lien.match(/[?&]id=([\w-]+)/);
  if (trouve) {
    // Adresse directe de l'image chez Google (le navigateur la garde en mémoire 24 h)
    return "https://lh3.googleusercontent.com/d/" + trouve[1] + "=w400";
  }
  // Autre adresse d'image (https://…) : utilisée telle quelle
  return lien.startsWith("http") ? lien : "";
}

// Rond de l'athlète : ses initiales, recouvertes par sa photo quand elle existe.
// Si la photo ne se charge pas (lien faux, dossier non partagé, réseau…), l'image est
// cachée (onerror) et les initiales réapparaissent. Le site la réessaie toutes les 30 s.
// taille : "" (classements), "grand" (grille) ou "tres-grand" (profil)
function rondAthlete(dossard, taille = "") {
  const participant = trouverParticipant(dossard);
  if (!participant) return `<span class="avatar ${taille}">?</span>`;

  const initiales = participant["prénom"].charAt(0) + participant.nom.charAt(0);
  const photo = adressePhoto(participant.photo);
  const image = photo ? `<img src="${echapper(photo)}" alt="" onerror="this.hidden = true">` : "";
  return `<span class="avatar ${taille}">${echapper(initiales)}${image}</span>`;
}


// ---------- 5. CALCUL DES CLASSEMENTS ----------
// Chaque épreuve est transformée en une liste de lignes de la forme :
//   { dossard: "1", nom: "Camille Martin", genre: "F", detail: "Série 1", perf: 14.72 }
// ⚠️ Règles provisoires : simple tri par performance, en attendant les règles
//    des organisateurs (ex. 100 m : vainqueurs de série d'abord ?).

// Courses (100 m, 800 m) : la performance est le temps
function lignesCourse(onglet) {
  return donnees[onglet].map(function (ligne) {
    const participant = trouverParticipant(ligne.dossard);
    return {
      dossard: ligne.dossard,
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
      dossard: ligne.dossard,
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
    const coureurs = [equipe["coureur 1"], equipe["coureur 2"], equipe["coureur 3"], equipe["coureur 4"]]
      .filter(d => d !== "");
    return {
      nom: "Équipe " + equipe["équipe"],
      coureurs: coureurs,   // dossards des 4 coureurs (sert au profil)
      genre: "",
      detail: coureurs.map(nomDuDossard).join(" · "),
      perf: enNombre(equipe.temps),
    };
  });
}

// Les 4 épreuves individuelles (utilisées par les pages Classements et Profil)
const EPREUVES = [
  { onglet: "100m",     titre: "100 m",            lignes: () => lignesCourse("100m"),       plusPetitGagne: true,  formater: formaterTemps },
  { onglet: "800m",     titre: "800 m",            lignes: () => lignesCourse("800m"),       plusPetitGagne: true,  formater: formaterTemps },
  { onglet: "longueur", titre: "Saut en longueur", lignes: () => lignesConcours("longueur"), plusPetitGagne: false, formater: formaterDistance },
  { onglet: "poids",    titre: "Lancer de poids",  lignes: () => lignesConcours("poids"),    plusPetitGagne: false, formater: formaterDistance },
];

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


// ---------- 6. PAGES CLASSEMENTS ----------

// Colonne Rang : pastille Or / Argent / Bronze pour les 3 premiers, sinon le numéro
function pastilleRang(rang) {
  if (rang === 1) return '<span class="medaille or">O</span>';
  if (rang === 2) return '<span class="medaille argent">A</span>';
  if (rang === 3) return '<span class="medaille bronze">B</span>';
  return `<span class="numero">${rang || "–"}</span>`;   // « – » : pas encore de résultat
}

// Écrit le tableau d'un classement dans son conteneur.
// titreColonne : « Athlète », ou « Équipe » pour le relais
function afficherTableau(conteneur, lignes, formater, titreColonne) {
  if (lignes.length === 0) {
    conteneur.innerHTML = '<p class="vide">Pas encore de résultats.</p>';
    return;
  }

  // Ligne des titres de colonnes
  let html = `
    <table class="tableau">
      <thead>
        <tr><th>Rang</th><th>${titreColonne}</th><th>Résultat</th></tr>
      </thead>
      <tbody>`;

  // Une ligne par athlète (ou par équipe)
  lignes.forEach(function (ligne) {
    const contenu = `
              ${ligne.dossard ? rondAthlete(ligne.dossard) : ""}
              <div><span class="nom">${echapper(ligne.nom)}</span><span class="detail">${echapper(ligne.detail)}</span></div>`;
    // Un athlète est cliquable : le lien ouvre son profil
    const athlete = ligne.dossard
      ? `<a class="athlete" href="#participant-${encodeURIComponent(ligne.dossard)}">${contenu}</a>`
      : `<div class="athlete">${contenu}</div>`;
    html += `
        <tr>
          <td class="rang">${pastilleRang(ligne.rang)}</td>
          <td>${athlete}</td>
          <td class="perf">${ligne.perf !== null ? formater(ligne.perf) : "–"}</td>
        </tr>`;
  });

  html += `
      </tbody>
    </table>
    <p class="maj">Mis à jour à ${heureMaj}</p>`;
  conteneur.innerHTML = html;
}

// Affiche le classement d'une épreuve en tenant compte du filtre Mixte / Femmes / Hommes
function afficherEpreuve(epreuve, lignes, plusPetitGagne, formater, titreColonne = "Athlète") {
  const page = document.getElementById("classement-" + epreuve);

  // Genre du bouton sélectionné : "" (mixte), "F" ou "H". Le relais n'a pas de filtre.
  const boutonActif = page.querySelector(".filtres .actif");
  const genre = boutonActif ? boutonActif.dataset.genre : "";
  if (genre) {
    lignes = lignes.filter(ligne => ligne.genre === genre);
  }

  afficherTableau(page.querySelector(".resultats"), classer(lignes, plusPetitGagne), formater, titreColonne);
}

// Affiche tous les classements (le général attend son barème de points)
function afficherClassements() {
  if (!donnees) return;   // rien n'est encore chargé
  EPREUVES.forEach(function (e) {
    afficherEpreuve(e.onglet, e.lignes(), e.plusPetitGagne, e.formater);
  });
  afficherEpreuve("relais", lignesRelais(), true, formaterTemps, "Équipe");
}


// ---------- 7. PAGE PARTICIPANTS : grille de cartes ----------

function afficherParticipants() {
  const grille = document.getElementById("grille-participants");

  // Tri par prénom, pour retrouver facilement quelqu'un
  const participants = [...donnees.participants].sort(function (a, b) {
    return a["prénom"].localeCompare(b["prénom"], "fr");
  });

  if (participants.length === 0) {
    grille.innerHTML = '<p class="vide">Pas encore de participants.</p>';
    return;
  }

  // Une carte par participant : un clic ouvre son profil
  grille.innerHTML = participants.map(function (p) {
    return `
      <a class="carte-athlete" href="#participant-${encodeURIComponent(p.dossard)}">
        ${rondAthlete(p.dossard, "grand")}
        <span class="nom">${echapper(nomComplet(p))}</span>
        <span class="detail">Dossard ${echapper(p.dossard)}</span>
      </a>`;
  }).join("");
}


// ---------- 8. PAGE PROFIL D'UN ATHLÈTE (adresse #participant-12) ----------

function afficherProfil() {
  const adresse = location.hash.slice(1);
  if (!donnees || !adresse.startsWith("participant-")) return;   // on n'est pas sur un profil

  const conteneur = document.getElementById("contenu-profil");
  const dossard = decodeURIComponent(adresse.slice("participant-".length));
  const participant = trouverParticipant(dossard);
  if (!participant) {
    conteneur.innerHTML = `<p class="vide">Aucun participant avec le dossard ${echapper(dossard)}.</p>`;
    return;
  }

  const feminin = participant.genre === "F";
  const aUnGenre = participant.genre === "F" || participant.genre === "H";

  // Une ligne par épreuve individuelle : résultat, rang mixte et rang parmi son genre
  let lignesHtml = "";
  EPREUVES.forEach(function (e) {
    const lignes = e.lignes();

    // Rang mixte (on le note tout de suite : le classement suivant va le remplacer)
    const moi = classer(lignes, e.plusPetitGagne).find(l => l.dossard === dossard);
    const rangMixte = moi ? moi.rang : undefined;

    // Rang parmi les femmes ou parmi les hommes (ex. « 3e femme »)
    let texteGenre = "";
    if (aUnGenre) {
      const memeGenre = classer(lignes.filter(l => l.genre === participant.genre), e.plusPetitGagne);
      const moiGenre = memeGenre.find(l => l.dossard === dossard);
      if (moiGenre && moiGenre.rang) {
        texteGenre = ordinal(moiGenre.rang, feminin) + (feminin ? " femme" : " homme");
      }
    }

    lignesHtml += `
        <tr>
          <td>${e.titre}<span class="detail">${moi ? echapper(moi.detail) : "Pas inscrit"}</span></td>
          <td>${pastilleRang(rangMixte)}<span class="detail">${texteGenre}</span></td>
          <td class="perf">${moi && moi.perf !== null ? e.formater(moi.perf) : "–"}</td>
        </tr>`;
  });

  // Relais : l'équipe dans laquelle court l'athlète
  const equipe = classer(lignesRelais(), true).find(eq => eq.coureurs.includes(dossard));
  if (equipe) {
    lignesHtml += `
        <tr>
          <td>Relais 4 × 100 m<span class="detail">${echapper(equipe.nom)} : ${echapper(equipe.detail)}</span></td>
          <td>${pastilleRang(equipe.rang)}</td>
          <td class="perf">${equipe.perf !== null ? formaterTemps(equipe.perf) : "–"}</td>
        </tr>`;
  }

  // Classement général : en attente du barème de points
  lignesHtml += `
        <tr>
          <td>Classement général<span class="detail">Barème de points à venir</span></td>
          <td>${pastilleRang(undefined)}</td>
          <td class="perf">–</td>
        </tr>`;

  conteneur.innerHTML = `
    <div class="profil-entete">
      ${rondAthlete(dossard, "tres-grand")}
      <div>
        <p class="etiquette">Dossard ${echapper(dossard)}</p>
        <h2>${echapper(nomDuDossard(dossard))}</h2>
      </div>
    </div>

    <p class="etiquette">Résultats</p>
    <table class="tableau">
      <thead>
        <tr><th>Épreuve</th><th>Rang</th><th>Résultat</th></tr>
      </thead>
      <tbody>${lignesHtml}
      </tbody>
    </table>
    <p class="maj">Mis à jour à ${heureMaj}</p>`;
}

// Quand l'adresse change (clic sur un athlète), on affiche son profil
window.addEventListener("hashchange", afficherProfil);


// ---------- 9. FILTRES MIXTE / FEMMES / HOMMES ----------

document.querySelectorAll(".filtres button").forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    // On désélectionne les boutons voisins, on sélectionne celui qui a été cliqué…
    bouton.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("actif"));
    bouton.classList.add("actif");
    // … et on réaffiche les classements avec ce filtre
    afficherClassements();
  });
});


// ---------- 10. MISE À JOUR AUTOMATIQUE ----------

// Remplit toutes les pages qui dépendent du Sheet
function afficherTout() {
  afficherClassements();
  afficherParticipants();
  afficherProfil();
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

async function mettreAJour() {
  try {
    const nouvelles = await chargerDonnees();
    heureMaj = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (JSON.stringify(nouvelles) !== JSON.stringify(donnees)) {
      // Les données ont changé : on redessine les pages
      donnees = nouvelles;
      afficherTout();
    } else {
      // Rien de nouveau : on met juste l'heure à jour (évite que les photos clignotent)
      document.querySelectorAll(".maj").forEach(function (p) {
        p.textContent = "Mis à jour à " + heureMaj;
      });
      // Photos qui n'ont pas pu se charger : on les réessaie
      document.querySelectorAll(".avatar img[hidden]").forEach(function (img) {
        img.hidden = false;
        img.src = img.src;
      });
    }
  } catch (erreur) {
    console.error(erreur);
    // Si des résultats sont déjà affichés, on les garde ; sinon on prévient
    if (!donnees) afficherErreur();
  }
}

mettreAJour();                             // au chargement du site
setInterval(mettreAJour, FREQUENCE_MAJ);   // puis toutes les 30 secondes
