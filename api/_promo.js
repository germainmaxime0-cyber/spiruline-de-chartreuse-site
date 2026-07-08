// Catalogue des codes promo "manuels" (à distribuer, ex. à des partenaires). Ajoutez-en de nouveaux ici.
// Ces codes n'ont plus de condition de compte/première commande : ils marchent à chaque commande,
// pour n'importe quel client (connecté ou non).
//
// Deux types de code :
//   - { type: 'percent', percentOff } : réduction en % sur le panier (produits) uniquement, jamais sur la livraison.
//   - { type: 'freeShipping' } : livraison offerte, quel que soit le montant du panier.
// Le seuil de livraison gratuite à 100€ (FREE_SHIPPING_THRESHOLD, voir _catalog.js) reste calculé sur le
// panier AVANT réduction, et s'applique toujours en plus de ces codes.
//
// La réduction automatique de 10% à la première commande d'un compte (sans code à saisir) est gérée
// séparément par FIRST_ORDER_DISCOUNT_PERCENT, appliquée directement dans create-checkout-session.js
// et create-manual-order.js (même règle : jamais sur la livraison).

const PROMO_CODES = {
  TRAILER: { type: 'percent', percentOff: 10 },
  SPIRULINE: { type: 'freeShipping' },
  FOLIE: { type: 'percent', percentOff: 20 },
};

const FIRST_ORDER_DISCOUNT_PERCENT = 10;

function getPromoCode(code) {
  if (!code) return null;
  return PROMO_CODES[code.trim().toUpperCase()] || null;
}

module.exports = { getPromoCode, FIRST_ORDER_DISCOUNT_PERCENT };
