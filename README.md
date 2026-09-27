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
- **Participants** : une carte par athlète avec sa photo. Un clic ouvre son profil : ses résultats
  et son rang dans chaque épreuve (au classement mixte et parmi les femmes ou les hommes).
  Dans les classements, un clic sur un athlète ouvre aussi son profil.

Chaque page a sa propre adresse (par exemple `…/#classement-100m`, ou `…/#participant-12` pour un profil) : on peut envoyer le lien direct d'un classement ou d'un athlète.

Les équipes du relais sont composées automatiquement à partir des résultats des courses,
pour obtenir des équipes de niveau homogène.

## Fonctionnement

- Site statique (HTML / CSS / JavaScript, sans framework), hébergé sur GitHub Pages.
- Les résultats sont saisis par les organisateurs dans un Google Sheet.
- Le site lit ce Google Sheet et calcule les classements automatiquement : pas de serveur, pas de login.
- Les classements se mettent à jour tout seuls toutes les 30 secondes.
- Les photos des participants sont hébergées sur Google Drive, jamais dans ce dépôt : le lien de chaque photo est collé dans le Google Sheet. Sans photo, le site affiche les initiales.

## Voir le site

### En ligne

Une fois GitHub Pages activé : **https://hadri2t.github.io/decathlon/**

### En local, sur ordinateur

Le site doit être ouvert via un petit serveur local : ouvert par un simple double-clic sur
`index.html`, il s'affiche, mais Google refuse de lui envoyer les résultats.

1. Télécharger ou cloner le dépôt.
2. Dans un terminal, depuis le dossier du projet :
   ```
   python3 -m http.server 8000 --bind 127.0.0.1
   ```
3. Ouvrir **http://localhost:8000** dans le navigateur.
4. Pour arrêter le serveur : `Ctrl + C` dans le terminal.

### Simuler l'affichage téléphone sur ordinateur

Le site est conçu d'abord pour le téléphone. Pour le voir comme sur un mobile :

1. Ouvrir le site dans Chrome (http://localhost:8000).
2. Ouvrir les outils de développement : `Cmd + Option + I` (Mac) ou `F12` (Windows).
3. Activer le mode appareil : `Cmd + Shift + M` (Mac) ou `Ctrl + Shift + M` (Windows).
4. Choisir un modèle de téléphone en haut de l'écran (par exemple iPhone 14).

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Contenu du site : en-tête, menu et toutes les pages |
| `style.css` | Apparence : menu téléphone et ordinateur, mise en page |
| `app.js` | Navigation entre les pages, ouverture du menu |
| `resultats.js` | Lecture du Google Sheet, classements, filtres Mixte / Femmes / Hommes, grille des participants et profils |
