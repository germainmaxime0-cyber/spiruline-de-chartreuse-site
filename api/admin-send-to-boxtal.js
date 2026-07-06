// Envoie une commande "à traiter" vers Boxtal pour créer réellement l'expédition (déclenché
// manuellement depuis /admin.html, jamais automatiquement à la réception du paiement).
//
// Variables d'environnement à configurer (voir aussi api/_boxtal.js) — des valeurs par défaut
// confirmées par le support Boxtal sont déjà en place pour la France, mais restent modifiables :
//   BOXTAL_OFFER_CODE_RELAIS     — défaut "CHRP-Chrono2ShopDirect" (Chronopost, point relais France)
//   BOXTAL_OFFER_CODE_DOMICILE   — défaut "POFR-ColissimoAccess" (Colissimo domicile sans signature)
//   BOXTAL_OFFER_ID_RELAIS / BOXTAL_OFFER_ID_DOMICILE
//                                — uniquement si vous avez un contrat direct Colissimo/Lettre suivie
//                                  rattaché à votre compte Boxtal (shippingOfferId) — pas votre cas
//                                  d'après le support Boxtal, ces variables ne servent probablement pas.
//   PACKAGE_LENGTH_CM / PACKAGE_WIDTH_CM / PACKAGE_HEIGHT_CM
//                                — dimensions par défaut du colis expédié, en centimètres.
//                                  Valeurs de départ à vérifier/ajuster : elles ne reflètent pas
//                                  forcément vos emballages réels.
//   BOXTAL_CONTENT_CATEGORY_ID  — optionnel, id de catégorie de contenu (GET /content-category)

const { requireAuth } = require('./_auth');
const { getOrder, updateOrder } = require('./_orders');
const { boxtalRequest } = require('./_boxtal');

const DEFAULT_OFFER_CODES = {
  relais: 'CHRP-Chrono2ShopDirect',
  domicile: 'POFR-ColissimoAccess',
};

const SENDER = {
  type: 'BUSINESS',
  contact: {
    email: 'contact@spirulinedechartreuse.com',
    phone: '+33659799633',
    company: "GAEC Char'Algue",
    firstName: 'Renaud',
    lastName: 'Stalinski',
  },
  location: {
    number: '458',
    street: 'Rue de la Grande Terre',
    city: 'Le Touvet',
    postalCode: '38660',
    countryIsoCode: 'FR',
  },
};

function normalizePhone(phone) {
  const digits = (phone || '').replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `+33${digits.slice(1)}`;
  return digits;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  const { orderId } = req.body || {};
  const order = orderId && (await getOrder(orderId));
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  const isRelais = order.modeLivraisonCle === 'relais';
  const offerCode = isRelais
    ? (process.env.BOXTAL_OFFER_CODE_RELAIS || DEFAULT_OFFER_CODES.relais)
    : (process.env.BOXTAL_OFFER_CODE_DOMICILE || DEFAULT_OFFER_CODES.domicile);
  const offerId = isRelais ? process.env.BOXTAL_OFFER_ID_RELAIS : process.env.BOXTAL_OFFER_ID_DOMICILE;

  if (!offerCode && !offerId) {
    return res.status(500).json({ error: `Identifiant d'offre Boxtal (code ou id) non configuré pour le mode "${order.modeLivraisonCle}"` });
  }
  if (order.modeLivraisonCle === 'relais' && !order.pointRelaisCode) {
    return res.status(400).json({ error: 'Point relais manquant sur cette commande' });
  }

  const shipment = {
    fromAddress: SENDER,
    toAddress: {
      type: 'RESIDENTIAL',
      contact: {
        email: order.email,
        phone: normalizePhone(order.telephone),
        firstName: order.prenom,
        lastName: order.nom,
      },
      location: {
        street: order.adresse.rue,
        city: order.adresse.ville,
        postalCode: order.adresse.codePostal,
        countryIsoCode: order.adresse.pays || 'FR',
      },
    },
    packages: [
      {
        type: 'PARCEL',
        weight: order.poidsColisKg,
        length: parseInt(process.env.PACKAGE_LENGTH_CM || '25', 10),
        width: parseInt(process.env.PACKAGE_WIDTH_CM || '20', 10),
        height: parseInt(process.env.PACKAGE_HEIGHT_CM || '15', 10),
        value: { value: order.montantTotalEur || 0, currency: 'EUR' },
        ...(process.env.BOXTAL_CONTENT_CATEGORY_ID
          ? { content: { id: process.env.BOXTAL_CONTENT_CATEGORY_ID, description: 'Compléments alimentaires à base de spiruline' } }
          : {}),
      },
    ],
  };
  if (order.modeLivraisonCle === 'relais') {
    shipment.pickupPointCode = order.pointRelaisCode;
  }

  try {
    const data = await boxtalRequest('/shipping/v3.1/shipping-order', {
      method: 'POST',
      body: {
        shipment,
        ...(offerId ? { shippingOfferId: offerId } : { shippingOfferCode: offerCode }),
      },
    });

    const updated = await updateOrder(order.id, {
      status: 'envoye',
      boxtal: { shippingOrderId: data.content.id, status: data.content.status },
    });
    return res.status(200).json({ order: updated });
  } catch (err) {
    console.error('Erreur envoi commande à Boxtal :', order.id, err.status, err.data || err.message);
    const updated = await updateOrder(order.id, {
      status: 'erreur',
      boxtal: { error: (err.data && JSON.stringify(err.data)) || err.message },
    });
    return res.status(502).json({ error: 'Échec de la création de l\'expédition Boxtal', order: updated });
  }
};
