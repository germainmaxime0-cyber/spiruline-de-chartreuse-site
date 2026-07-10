// Fonction serverless Vercel — crée une session de paiement Stripe à partir du panier envoyé par le site.
// Déploiement : voir les instructions données dans la conversation (compte Vercel + variable d'environnement STRIPE_SECRET_KEY).

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Catalogue AUTORITAIRE côté serveur (prix + poids colis) : les prix envoyés par le navigateur
// ne sont jamais utilisés tels quels, on recalcule toujours à partir de ce catalogue pour éviter
// qu'un client ne modifie un prix côté front-end.
// Doit rester synchronisé avec le CATALOG déclaré dans commander.html (mêmes identifiants produit/variante).
const { CATALOG, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES, SHIPPING_LABELS } = require('./_catalog');
const { getLoggedInEmail } = require('./_customer-auth');
const { getCustomer } = require('./_customers');
const { getPromoCode, FIRST_ORDER_DISCOUNT_PERCENT } = require('./_promo');

const SITE_URL = process.env.SITE_URL || 'https://www.spirulinedechartreuse.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { items, shipping, address, pickupPointCode, pickupPointName, promoCode } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    // La réduction n'est jamais calculée depuis une donnée envoyée par le navigateur : on relit
    // toujours la session client signée par cookie et l'état "a déjà commandé" stocké côté serveur.
    const loggedInEmail = getLoggedInEmail(req);

    // Réduction automatique de 10% à la toute première commande d'un compte, sans code à saisir.
    let autoPercentOff = 0;
    if (loggedInEmail) {
      const customer = await getCustomer(loggedInEmail);
      if (customer && !customer.hasOrdered) {
        autoPercentOff = FIRST_ORDER_DISCOUNT_PERCENT;
      }
    }

    // Code promo manuel (ex. codes partenaires) : valable à chaque commande, pour tout le monde.
    // Deux types possibles : réduction en % sur le panier (jamais sur la livraison), ou livraison offerte.
    let codePercentOff = 0;
    let codeFreeShipping = false;
    if (promoCode) {
      const promo = getPromoCode(promoCode);
      if (!promo) {
        return res.status(400).json({ error: 'Code promo invalide' });
      }
      if (promo.type === 'percent') {
        codePercentOff = promo.percentOff;
      } else if (promo.type === 'freeShipping') {
        codeFreeShipping = true;
      }
    }

    // On ne cumule pas deux réductions en % : on applique la plus avantageuse des deux (auto vs code).
    // La livraison offerte par code s'ajoute en plus, puisqu'elle porte sur un montant différent (le port, pas le panier).
    const promoPercentOff = Math.max(autoPercentOff, codePercentOff);

    const shippingKey = SHIPPING_RATES.hasOwnProperty(shipping) ? shipping : 'relais';

    const requiredAddressFields = shippingKey === 'retrait'
      ? ['prenom', 'nom', 'email', 'telephone', 'pays']
      : ['prenom', 'nom', 'email', 'telephone', 'rue', 'codePostal', 'ville', 'pays'];
    if (!address || requiredAddressFields.some((f) => !address[f])) {
      return res.status(400).json({ error: 'Coordonnées de livraison incomplètes' });
    }

    if (shippingKey === 'relais' && !pickupPointCode) {
      return res.status(400).json({ error: 'Point relais manquant' });
    }

    // Construction des line_items Stripe à partir du catalogue serveur (jamais des prix envoyés par le client)
    const line_items = [];
    let subtotal = 0;
    let parcelWeightG = 0;
    let netWeightG = 0;

    for (const item of items) {
      const product = CATALOG[item.productId];
      const variant = product && product.variants[item.variantIndex];
      const quantity = parseInt(item.quantity, 10);

      if (!product || !variant || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'Article de panier invalide' });
      }

      subtotal += variant.price * quantity;
      parcelWeightG += variant.weightG * quantity;
      netWeightG += variant.netG * quantity;

      // La réduction en % (auto première commande ou code) s'applique ici, sur le prix produit,
      // jamais sur la livraison : on l'applique directement sur le prix unitaire plutôt que via un
      // coupon Stripe global, qui aurait aussi réduit la ligne de livraison.
      const discountedUnitPrice = promoPercentOff ? variant.price * (1 - promoPercentOff / 100) : variant.price;

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `${product.name} — ${variant.weight}` },
          unit_amount: Math.round(discountedUnitPrice * 100),
        },
        quantity,
      });
    }

    // Frais de port : gratuits à partir du seuil (calculé sur le panier avant réduction) ou avec un
    // code "livraison offerte", sinon tarif selon le mode choisi.
    const shippingCost = (subtotal >= FREE_SHIPPING_THRESHOLD || codeFreeShipping) ? 0 : SHIPPING_RATES[shippingKey];

    if (shippingCost > 0) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `Livraison — ${SHIPPING_LABELS[shippingKey]}` },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Pas de payment_method_types fixé volontairement : Stripe affiche alors automatiquement
      // les moyens de paiement activés dans le Dashboard (carte, Apple Pay, Google Pay, PayPal...)
      // selon l'appareil et le pays du client, sans avoir à les lister ici.
      line_items,
      customer_email: address.email,
      success_url: `${SITE_URL}/commander.html?paiement=succes`,
      cancel_url: `${SITE_URL}/commander.html?paiement=annule`,
      // Métadonnées relues par /api/stripe-webhook.js pour transférer automatiquement la commande
      // vers Boxtal/La Poste Pro (en "à traiter", sans générer le bon de livraison automatiquement)
      // et visibles aussi directement sur la page du paiement dans le Dashboard Stripe en secours.
      // L'adresse est collectée sur notre propre page (pas via Stripe) pour permettre le choix
      // d'un point relais précis avant paiement.
      // Le numéro de commande n'est PAS généré ici : une session Stripe créée mais abandonnée
      // (client qui ferme l'onglet, carte refusée...) ne doit pas consommer de numéro. Il est
      // généré uniquement dans stripe-webhook.js, au moment où le paiement est réellement confirmé.
      metadata: {
        mode_paiement: 'carte',
        mode_livraison_cle: shippingKey,
        mode_livraison: SHIPPING_LABELS[shippingKey],
        poids_colis: `${(parcelWeightG / 1000).toFixed(2)} kg`,
        poids_spiruline_kg: (netWeightG / 1000).toFixed(3),
        point_relais: pickupPointCode || '',
        point_relais_nom: pickupPointName || '',
        compte_client: loggedInEmail || '',
        adresse: JSON.stringify(address),
        panier: JSON.stringify(items.map(i => ({ p: i.productId, v: i.variantIndex, q: parseInt(i.quantity, 10) }))),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur création session Stripe :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
