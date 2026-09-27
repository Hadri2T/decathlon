# Décathlon de Pantin

Site de suivi en direct d'une rencontre amicale d'athlétisme organisée à Pantin.

## Le projet

Une journée d'initiation à l'athlétisme entre amis : une vingtaine de participants adultes,
non licenciés, sur un stade municipal de Pantin. L'événement est privé, sans enjeu officiel,
et pensé pour faire découvrir l'athlétisme dans un cadre convivial.

Cinq épreuves sont au programme :

| Épreuve | Format |
|---|---|
| 100 m | 4 séries de 5 |
| 800 m | 2 séries de 10 |
| Saut en longueur | 3 essais par participant |
| Lancer de poids (4 kg) | 3 essais par participant |
| Relais 4 × 100 m | 5 équipes de 4, hors classement général |

## Ce que fait le site

Le site est consultable sur téléphone pendant toute la journée, sans compte ni installation.

- **Accueil** : date, lieu, infos pratiques et programme de la journée.
- **Épreuves** : horaires, format et consignes de chaque épreuve.
- **Classements** : un classement par épreuve et un classement général, en version mixte, femmes et hommes, mis à jour au fil de la journée.
- **Participants** : le profil de chaque athlète, avec sa photo et ses résultats.

Chaque page a sa propre adresse (par exemple `…/#classement-100m`) : on peut envoyer le lien direct d'un classement.

Les équipes du relais sont composées automatiquement à partir des résultats des courses,
pour obtenir des équipes de niveau homogène.

## Fonctionnement

- Site statique (HTML / CSS / JavaScript, sans framework), hébergé sur GitHub Pages.
- Les résultats sont saisis par les organisateurs dans un Google Sheet.
- Le site lit ce Google Sheet et calcule les classements automatiquement : pas de serveur, pas de login.
- Les photos des participants sont hébergées sur Google Drive, jamais dans ce dépôt.

## Voir le site

### En ligne

Une fois GitHub Pages activé : **https://hadri2t.github.io/decathlon/**

### En local, sur ordinateur

1. Télécharger ou cloner le dépôt.
2. Double-cliquer sur `index.html` : le site s'ouvre dans le navigateur.

### Simuler l'affichage téléphone sur ordinateur

Le site est conçu d'abord pour le téléphone. Pour le voir comme sur un mobile :

1. Ouvrir `index.html` dans Chrome.
2. Ouvrir les outils de développement : `Cmd + Option + I` (Mac) ou `F12` (Windows).
3. Activer le mode appareil : `Cmd + Shift + M` (Mac) ou `Ctrl + Shift + M` (Windows).
4. Choisir un modèle de téléphone en haut de l'écran (par exemple iPhone 14).

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Contenu du site : en-tête, menu et toutes les pages |
| `style.css` | Apparence : menu téléphone et ordinateur, mise en page |
| `app.js` | Navigation entre les pages, ouverture du menu, filtres des classements |
