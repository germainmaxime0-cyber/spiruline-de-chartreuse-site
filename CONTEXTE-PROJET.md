# PROJET : Site web Spiruline de Chartreuse

## Client
GAEC Char'Algue — Maxime Germain (auto-construction) + Renaud Stalinski (docteur biologie)
Adresse : 458 Rue de la Grande Terre, 38660 Le Touvet, Isère
SIRET : 83044121800013 — TVA FR13830441218 — Tél : 06 59 79 96 33
Email : contact@spirulinedechartreuse.com
Hébergeur : OVH — Stripe existant — Boxtal expédition
Réseaux : Facebook + Instagram @spiruline_de_chartreuse

## Règles techniques
- HTML statique pur, pas WordPress
- **Aucune image en base64** — toujours des fichiers réels dans /images/ (règle stricte)
- Couleurs : crème #F0EBE0 / vert #2d5a27 / vert foncé #1e4d20
- Polices : Playfair Display (titres) / Lato (nav, corps) / Merriweather (textes longs)
- Logo maître : images/logo.png (515×502px, version haute résolution)
- Responsive mobile inclus dans chaque page
- Menu : bascule en burger dès **1200px** (pas 900px — corrige un bug de chevauchement du bouton Commander avec Blog/Contact)

## Pages terminées et corrigées dans ce dossier
- **index.html** (accueil) — slider 4 photos, produits, avis, engagements, histoire
- **spiruline.html** (La Spiruline) — hero, histoire, bienfaits, précautions, composition, pour tous, mode d'emploi, qualité, CTA, FAQ

### Corrections déjà appliquées sur ces 2 pages
- Toutes les images extraites du base64 en fichiers réels, redimensionnées et compressées (poids total images ~1,6 Mo au lieu de 14+10 Mo)
- Un seul `<h1>` par page, optimisé SEO (mot-clé "spiruline" + localisation)
- Données structurées JSON-LD : LocalBusiness, Product ×3 (accueil), FAQPage + BreadcrumbList (page spiruline)
- Open Graph / Twitter Card, `<link rel="canonical">`, `preconnect` fonts Google
- Accessibilité : lien d'évitement, menus déroulants navigables au clavier (`:focus-within`), `aria-label`/`aria-expanded` sur tous les contrôles interactifs, FAQ en accordéon accessible (`aria-controls`, `hidden`), icônes décoratives masquées aux lecteurs d'écran, slider avec bouton pause + respect de `prefers-reduced-motion`
- `width`/`height` + `loading="lazy"` sur toutes les images, `fetchpriority="high"` sur l'image principale de chaque page

### ⚠️ Point non résolu
Les photos `images/hero-maxime-renaud-bassins.jpg` et `images/hero-ferme-chartreuse.jpg` ne sont qu'en 206×206px dans le fichier source — trop petites pour un usage plein écran sur le slider de l'accueil (rendu flou probable). Il faut les remplacer par les photos originales en haute résolution dès qu'elles sont disponibles.

## Images disponibles (déjà en place dans /images/)
Voir la liste des fichiers du dossier — tous nommés de façon descriptive (hero-*, produit-*, pourtous-*, histoire-*, logo*, etc.)

## Pages restantes à coder
- [ ] Visites
- [ ] Contact (carte points de vente)
- [ ] Blog
- [ ] Commander (Stripe Checkout)
- [ ] Pages légales : déjà codées (mentions-legales, CGV, confidentialité) — à récupérer si besoin
- [ ] Script Stripe + Boxtal (Vercel serverless)
- [ ] Mise en ligne OVH

## Structure de "Notre Spiruline" (à coder, pas encore commencée dans ce dossier)
Hero (Maxime bassins) → Ce qui nous distingue (6 illustrations) → La récolte (timeline 6 étapes) → La ferme → FAQ → CTA
- 6 illustrations avec titre intégré dans l'image
- Timeline alternée gauche/droite avec photos réelles
- Ferme : bâtiment construction + 3 photos (panneaux, armoire solaire, roue à aube)
- Encart spécial Brasserie du Habert avec lien
- CTA double : Commander + Visiter la ferme

## Produits et prix
- Paillettes : à partir de 16 €
- Poudre : à partir de 17 €
- Comprimés : à partir de 19 €
