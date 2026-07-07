// Fonction serverless Vercel — crée une session de paiement Stripe à partir du panier envoyé par le site.
// Déploiement : voir les instructions données dans la conversation (compte Vercel + variable d'environnement STRIPE_SECRET_KEY).

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Catalogue AUTORITAIRE côté serveur (prix + poids colis) : les prix envoyés par le navigateur
// ne sont jamais utilisés tels quels, on recalcule toujours à partir de ce catalogue pour éviter
// qu'un client ne modifie un prix côté front-end.
// Doit rester synchronisé avec le CATALOG déclaré dans commander.html (mêmes identifiants produit/variante).
const { CATALOG, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES, SHIPPING_LABELS } = require('./_catalog');

const SITE_URL = process.env.SITE_URL || 'https://www.spirulinedechartreuse.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { items, shipping, address, pickupPointCode } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    const requiredAddressFields = ['prenom', 'nom', 'email', 'telephone', 'rue', 'codePostal', 'ville', 'pays'];
    if (!address || requiredAddressFields.some((f) => !address[f])) {
      return res.status(400).json({ error: 'Coordonnées de livraison incomplètes' });
    }

    const shippingKey = SHIPPING_RATES.hasOwnProperty(shipping) ? shipping : 'relais';
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

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `${product.name} — ${variant.weight}` },
          unit_amount: Math.round(variant.price * 100),
        },
        quantity,
      });
    }

    // Frais de port : gratuits à partir du seuil, sinon tarif selon le mode choisi
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATES[shippingKey];

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
      payment_method_types: ['card'],
      line_items,
      customer_email: address.email,
      success_url: `${SITE_URL}/commander.html?paiement=succes`,
      cancel_url: `${SITE_URL}/commander.html?paiement=annule`,
      // Métadonnées relues par /api/stripe-webhook.js pour transférer automatiquement la commande
      // vers Boxtal/La Poste Pro (en "à traiter", sans générer le bon de livraison automatiquement)
      // et visibles aussi directement sur la page du paiement dans le Dashboard Stripe en secours.
      // L'adresse est collectée sur notre propre page (pas via Stripe) pour permettre le choix
      // d'un point relais précis avant paiement.
      metadata: {
        mode_livraison_cle: shippingKey,
        mode_livraison: SHIPPING_LABELS[shippingKey],
        poids_colis: `${(parcelWeightG / 1000).toFixed(2)} kg`,
        poids_spiruline_kg: (netWeightG / 1000).toFixed(3),
        point_relais: pickupPointCode || '',
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
