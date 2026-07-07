// Catalogue des codes promo "manuels" (à distribuer, ex. à des partenaires). Ajoutez-en de nouveaux ici.
// Ces codes n'ont plus de condition de compte/première commande : ils marchent à chaque commande,
// pour n'importe quel client (connecté ou non).
//
// La réduction automatique de 10% à la première commande d'un compte (sans code à saisir) est gérée
// séparément par FIRST_ORDER_DISCOUNT_PERCENT, appliquée directement dans create-checkout-session.js.

const PROMO_CODES = {
  SPIRULINE: { percentOff: 10 },
};

const FIRST_ORDER_DISCOUNT_PERCENT = 10;

function getPromoCode(code) {
  if (!code) return null;
  return PROMO_CODES[code.trim().toUpperCase()] || null;
}

module.exports = { getPromoCode, FIRST_ORDER_DISCOUNT_PERCENT };
