// Catalogue des codes promo. Ajoutez-en de nouveaux ici.
//
// requiresAccount : le client doit être connecté à un compte pour utiliser ce code.
// firstOrderOnly  : réservé à la toute première commande de ce compte (customer.hasOrdered doit être false).

const PROMO_CODES = {
  SPIRULINE: { percentOff: 10, requiresAccount: true, firstOrderOnly: true },
};

function getPromoCode(code) {
  if (!code) return null;
  return PROMO_CODES[code.trim().toUpperCase()] || null;
}

module.exports = { getPromoCode };
