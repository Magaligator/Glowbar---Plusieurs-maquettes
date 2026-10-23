# Glowbar — versions du site

Une page unique (`index.html`) donne accès aux quatre versions du site, chacune avec son accueil et sa boutique.

| Version | Dossier | Description |
|---|---|---|
| 1 | `1-perle/` | « Perle » — récit au scroll autour d'une perle 3D (WebGL), menu plein écran, points cliquables sur les produits |
| 2 | `2-atelier/` | « An atelier for your face » — direction chic, palette brun et rose |
| 3 | `3-rituel/` | « Le rituel en mouvement » — chiffres clés, visite du studio, sphères flottantes et apparitions au défilement |
| 4 | `4-blanc/` | Blanc épuré, boutons roses, rappels de brun, slider avant-gardiste, défilement fluide |

Chaque dossier est un site statique autonome : HTML, CSS et JavaScript, sans étape de build.

## Publier sur GitHub Pages

1. Créer un dépôt sur GitHub (par exemple `glowbar-versions`).
2. Depuis ce dossier :

```bash
git init
git add .
git commit -m "Glowbar — versions du site"
git branch -M main
git remote add origin https://github.com/<votre-compte>/glowbar-versions.git
git push -u origin main
```

3. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch → Branch : `main` / `(root)` → Save**.
4. Après environ une minute, la page est en ligne à l'adresse `https://<votre-compte>.github.io/glowbar-versions/`.

Tous les liens sont relatifs : le site fonctionne dans un sous-dossier, comme sur GitHub Pages.

## Avant de publier

- **Confidentialité** : GitHub Pages est public (sauf avec un compte qui permet les pages privées). Les maquettes sont couvertes par l'accord de confidentialité avec Glowbar. Les pages contiennent `noindex`, ce qui les masque des moteurs de recherche, mais quiconque connaît l'adresse peut les ouvrir.
- **Polices** : elles viennent de Google Fonts et demandent une connexion internet.
- **Formulaires** : le contact et la newsletter n'envoient rien pour l'instant, ils affichent seulement une confirmation.
- **Défilement fluide** : `3-rituel/assets/lenis.min.js` et `4-blanc/assets/lenis.min.js` sont la bibliothèque Lenis (licence MIT).

## Ouvrir en local

Double-cliquer sur `index.html`. Pour un rendu identique à GitHub Pages, lancer un petit serveur depuis ce dossier :

```bash
python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

