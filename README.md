# AlpRisk Explorer – Visualisation des dangers naturels en Valais

## Description du projet

AlpRisk Explorer est une application web permettant de visualiser les dangers naturels en Valais (Suisse), notamment :

- Avalanches
- Glissements de terrain
- Risques hydrologiques

L’application propose une visualisation interactive en 2D et en 3D, accompagnée d’un panneau latéral (sidebar) pour interagir avec les données.

---

## Architecture de l’application

### Structure globale

- App.vue → composant principal
- MapView.vue → carte 2D
- ThreeDView.vue → vue 3D
- Sidebar.vue → panneau de contrôle

---

## Fonctionnement

### Sidebar

- Permet de choisir la couche de danger à afficher
- Permet de rechercher une localisation à partir de coordonnées (CH1903+)
- Les coordonnées sélectionnées sont affichées sur la carte 2D et sur la vue 3D

### Carte 2D

- Basée sur OpenLayers
- Affiche les couches de dangers avec des styles adaptés
- Permet de cliquer sur un point pour afficher ses coordonnées
- Le point sélectionné est également localisé sur la vue 3D

### Vue 3D

- Basée sur Cesium
- Affiche le terrain, les bâtiments et les zones de dangers
- Permet d’afficher le type et le niveau de danger en cliquant sur une zone

---

## Sources des données

- Les données de fond de carte (carte 2D), le modèle numérique de terrain (MNT), l’orthophoto, les bâtiments 3D ainsi que la transformation des coordonnées (Reframe) proviennent des APIs de swisstopo

- Les données des dangers naturels proviennent du service cantonal DANAT du canton du Valais

---

## Guide d’utilisation

1. Choisir un type de danger dans le sidebar (avalanche, glissement ou hydrologie)
2. Explorer la carte 2D ou la vue 3D
3. Cliquer sur la carte 2D pour sélectionner un point et afficher ses coordonnées
4. Observer la position correspondante sur la vue 3D
5. Cliquer sur une zone de danger dans la vue 3D pour afficher ses informations

---

## Installation

```bash
git clone https://github.com/Rezak-mahia/AlpRisk_Explorer.git
cd AlpRisk_Explorer
npm install
npm run dev
```

Puis ouvrir dans le navigateur :

http://localhost:5173
