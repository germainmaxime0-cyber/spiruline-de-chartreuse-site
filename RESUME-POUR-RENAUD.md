# Où en est le site — résumé pour Renaud

## Ce qui fonctionne déjà

- **Boutique en ligne complète** : paillettes, poudre, comprimés (sachets, boîtes, vrac), avec panier, quantités modifiables, codes promo
- **Livraison** : point relais (avec carte interactive), domicile (Colissimo), ou retrait gratuit à la ferme
- **Paiement** : carte bancaire (+ Apple Pay/Google Pay/PayPal selon l'appareil), chèque, virement bancaire
- **Comptes clients** : création de compte, connexion, mot de passe oublié, historique des commandes ("Mon compte"), -10% automatique à la première commande
- **Emails automatiques** : confirmation de commande (client + nous), bienvenue à la création de compte, réinitialisation de mot de passe — via un service appelé Resend (en cours de finalisation, voir ci-dessous)
- **Expédition** : les commandes payées peuvent être envoyées vers Boxtal (Chronopost/Colissimo) en un clic depuis notre page d'administration — **basculé en mode réel cette semaine**, les vraies expéditions sont maintenant bien créées chez le transporteur
- **Administration** (`/admin.html`, protégée par mot de passe) : liste des commandes, statistiques de vente (chiffre d'affaires, produits les plus vendus, évolution par mois/semaine/année avec comparaison d'une année sur l'autre), export du fichier clients
- **Référencement** : le site est configuré pour être bien trouvé sur Google et par les assistants IA (ChatGPT, etc.), les anciennes adresses de l'ancien site redirigent maintenant vers les bonnes pages

## Ce qu'il reste à faire avant d'accepter de vraies commandes de vrais clients

1. **Finaliser l'envoi d'emails (Resend)** — la configuration technique est faite aujourd'hui, on attend juste que ce soit officiellement validé (propagation DNS, quelques heures). Une fois validé : tester qu'un vrai email de confirmation de commande part bien.
2. **Basculer Stripe en mode réel** — le site utilise encore les clés de **test** de Stripe (les paiements ne débitent personne pour l'instant). Il faudra remplacer par les clés réelles pour pouvoir encaisser de vrais paiements. C'est la dernière étape avant l'ouverture officielle.
3. **Faire un dernier test de commande complet**, une fois les deux points ci-dessus faits : commander un vrai produit, vérifier que le paiement, l'email de confirmation, l'apparition dans l'administration et l'envoi vers Boxtal fonctionnent bien ensemble.
4. Ajouter un moyen de paiement sur le compte Vercel (hébergement) avant la fin de l'essai gratuit.

## Question posée par Maxime : sécurité du site

Quelques points de sécurité à améliorer, à discuter ensemble :
- Ajouter une protection contre les tentatives répétées de connexion (empêcher quelqu'un d'essayer des centaines de mots de passe d'affilée sur l'administration ou les comptes clients)
- S'assurer que le mot de passe de l'administration est suffisamment fort et unique
- Vérifier régulièrement les tableaux de bord Stripe/Boxtal/Vercel pour toute activité inhabituelle
- Le reste (protection contre le vol de données, protection contre les manipulations de prix, etc.) est déjà en place depuis la construction du site.
