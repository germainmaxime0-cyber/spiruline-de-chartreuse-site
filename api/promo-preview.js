// Aperçu (lecture seule) d'un code promo, pour afficher la réduction dans le panier avant paiement.
// Ne fait AUCUNE confiance à cet aperçu pour le calcul final : create-checkout-session.js et
// create-manual-order.js revalident toujours le code et recalculent le montant côté serveur.

const { getPromoCode } = require('./_promo');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const code = req.query && req.query.code;
  const promo = getPromoCode(code);
  if (!promo) {
    return res.status(200).json({ valid: false });
  }

  if (promo.type === 'percent') {
    return res.status(200).json({ valid: true, type: 'percent', percentOff: promo.percentOff });
  }
  return res.status(200).json({ valid: true, type: 'freeShipping' });
};
