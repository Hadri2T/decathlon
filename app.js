// ==================== 1. AFFICHER LA BONNE PAGE ====================
// Chaque page est une <section class="page"> avec un id (ex. "classement-100m").
// Les liens du menu pointent vers "#id-de-la-page" : cliquer dessus change
// l'adresse (…/#classement-100m) et déclenche l'événement « hashchange ».
// Avantages : le bouton retour du téléphone marche, et on peut envoyer
// le lien direct d'une page à quelqu'un.

function afficherPage() {
  // Id de la page demandée : ce qui suit le # dans l'adresse (« accueil » s'il n'y a rien)
  let id = location.hash.slice(1) || "accueil";

  // Si l'adresse ne correspond à aucune page (faute de frappe…), on revient à l'accueil
  const page = document.getElementById(id);
  if (!page || !page.classList.contains("page")) {
    id = "accueil";
  }

  // Affiche la page demandée et cache les autres.
  // toggle("actif", vrai/faux) ajoute la classe si c'est vrai, l'enlève sinon.
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.toggle("actif", p.id === id);
  });

  // Souligne le lien du menu qui correspond à la page affichée
  document.querySelectorAll(".menu a").forEach(function (lien) {
    lien.classList.toggle("actif", lien.getAttribute("href") === "#" + id);
  });

  // Remonte en haut de la page
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", afficherPage);
afficherPage();   // au chargement du site


// ==================== 2. OUVRIR / FERMER LE MENU ====================
// Sur téléphone, ouvrir le menu = ajouter la classe « menu-ouvert » au body :
// le CSS fait alors glisser le panneau et affiche le voile sombre.

function fermerMenu() {
  document.body.classList.remove("menu-ouvert");
  // Referme aussi les sous-menus (Épreuves, Classements)
  document.querySelectorAll(".menu details").forEach(function (sousMenu) {
    sousMenu.open = false;
  });
}

document.getElementById("ouvrir-menu").addEventListener("click", function () {
  document.body.classList.add("menu-ouvert");
});

// Le menu se ferme : avec la croix, en touchant le voile, ou en choisissant une page
document.getElementById("fermer-menu").addEventListener("click", fermerMenu);
document.getElementById("voile").addEventListener("click", fermerMenu);
document.querySelectorAll(".menu a, .titre-site").forEach(function (lien) {
  lien.addEventListener("click", fermerMenu);
});

// Sur ordinateur : un clic n'importe où en dehors du menu referme le menu déroulant
document.addEventListener("click", function (evenement) {
  if (!evenement.target.closest(".menu")) {
    document.querySelectorAll(".menu details").forEach(function (sousMenu) {
      sousMenu.open = false;
    });
  }
});

// Les filtres Mixte / Femmes / Hommes et les classements sont dans resultats.js
