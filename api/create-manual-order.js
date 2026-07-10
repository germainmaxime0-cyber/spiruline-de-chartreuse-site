// Fonction serverless Vercel — enregistre directement une commande payée par chèque ou virement
// (sans passer par Stripe). La commande est créée avec le statut "en_attente_paiement" : elle
// n'est traitée/envoyée vers Boxtal qu'une fois le règlement reçu et validé depuis /admin.html
// ("Marquer comme payée").

const { CATALOG, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES, SHIPPING_LABELS } = require('./_catalog');
const { getLoggedInEmail } = require('./_customer-auth');
const { getCustomer, markCustomerOrdered } = require('./_customers');
const { getPromoCode, FIRST_ORDER_DISCOUNT_PERCENT } = require('./_promo');
const { saveOrder, generateOrderNumber } = require('./_orders');
const { sendEmail, businessEmail } = require('./_mailer');
const { customerRecapHtml, businessRecapHtml } = require('./_order-email');

const PAYMENT_LABELS = { cheque: 'Chèque', virement: 'Virement bancaire' };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { items, shipping, address, pickupPointCode, pickupPointName, promoCode, paymentMethod } = req.body;

    if (!PAYMENT_LABELS.hasOwnProperty(paymentMethod)) {
      return res.status(400).json({ error: 'Mode de paiement invalide' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    const loggedInEmail = getLoggedInEmail(req);

    let autoPercentOff = 0;
    if (loggedInEmail) {
      const customer = await getCustomer(loggedInEmail);
      if (customer && !customer.hasOrdered) {
        autoPercentOff = FIRST_ORDER_DISCOUNT_PERCENT;
      }
    }

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

    let subtotal = 0;
    let parcelWeightG = 0;
    let netWeightG = 0;
    const contenu = [];

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
      contenu.push({ description: `${product.name} — ${variant.weight}`, quantite: quantity });
    }

    // Réduction en % appliquée uniquement sur le panier (jamais sur la livraison) ; seuil de livraison
    // gratuite calculé sur le panier avant réduction, comme pour le paiement par carte.
    const shippingCost = (subtotal >= FREE_SHIPPING_THRESHOLD || codeFreeShipping) ? 0 : SHIPPING_RATES[shippingKey];
    const discountedSubtotal = promoPercentOff
      ? Math.round(subtotal * (1 - promoPercentOff / 100) * 100) / 100
      : subtotal;
    const montantTotalEur = discountedSubtotal + shippingCost;

    const orderNumber = await generateOrderNumber();

    const order = {
      id: `manual_${orderNumber}`,
      numeroCommande: orderNumber,
      modePaiement: paymentMethod,
      createdAt: new Date().toISOString(),
      status: 'en_attente_paiement',
      email: address.email,
      telephone: address.telephone,
      prenom: address.prenom,
      nom: address.nom,
      adresse: { rue: address.rue, codePostal: address.codePostal, ville: address.ville, pays: address.pays },
      modeLivraisonCle: shippingKey,
      modeLivraison: SHIPPING_LABELS[shippingKey],
      pointRelaisCode: pickupPointCode || null,
      pointRelaisNom: pickupPointName || null,
      poidsColisKg: parcelWeightG / 1000,
      poidsSpirulineKg: netWeightG / 1000,
      montantTotalEur,
      contenu,
      boxtal: null,
    };

    await saveOrder(order);

    if (loggedInEmail) {
      await markCustomerOrdered(loggedInEmail);
    }

    try {
      await sendEmail({ to: order.email, subject: `Confirmation de votre commande n°${order.numeroCommande}`, html: customerRecapHtml(order) });
      await sendEmail({ to: businessEmail(), subject: `Nouvelle commande n°${order.numeroCommande}`, html: businessRecapHtml(order) });
    } catch (emailErr) {
      console.error('Échec de l\'envoi des emails de récapitulatif de commande', order.id, emailErr);
    }

    return res.status(200).json({ numeroCommande: order.numeroCommande, modePaiement: order.modePaiement });
  } catch (err) {
    console.error('Erreur création commande manuelle :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
