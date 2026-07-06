// Catalogue AUTORITAIRE utilisé par create-checkout-session.js (prix + poids colis).
// Doit rester synchronisé avec le CATALOG déclaré côté front-end dans commander.html (mêmes identifiants produit/variante).
//
// weightG = poids réel du colis expédié en grammes (poids du produit + emballage), affiché dans les
// métadonnées Stripe pour créer le bon de livraison à la main sur Boxtal/La Poste Pro. Règle d'emballage
// donnée par le client : +200g si le produit pèse moins de 500g, +300g si le produit pèse 500g ou plus.

const CATALOG = {
  'sachet-paillettes': { name: 'Spiruline en paillettes — Sachet', variants: [{ weight: '100g', price: 16, weightG: 300 }] },
  'sachet-poudre':     { name: 'Spiruline en poudre — Sachet',     variants: [{ weight: '100g', price: 17, weightG: 300 }] },
  'sachet-comprimes':  { name: 'Spiruline en comprimés — Sachet',  variants: [{ weight: '100g', price: 19, weightG: 300 }] },
  'boite-paillettes':  { name: 'Spiruline en paillettes — Boîte',  variants: [{ weight: '400g', price: 59, weightG: 600 }] },
  'boite-poudre':      { name: 'Spiruline en poudre — Boîte',      variants: [{ weight: '500g', price: 79, weightG: 800 }] },
  'boite-comprimes':   { name: 'Spiruline en comprimés — Boîte',   variants: [{ weight: '500g', price: 89, weightG: 800 }] },
  'vrac-paillettes': {
    name: 'Spiruline en paillettes — Vrac',
    variants: [
      { weight: '400g', price: 59, weightG: 600 },
      { weight: '600g', price: 88.5, weightG: 900 },
      { weight: '1kg', price: 145, weightG: 1300 },
      { weight: '1.5kg', price: 214, weightG: 1800 },
      { weight: '2kg', price: 280, weightG: 2300 },
    ],
  },
  'vrac-comprimes': {
    name: 'Spiruline en comprimés — Vrac',
    variants: [
      { weight: '500g', price: 89, weightG: 800 },
      { weight: '600g', price: 106.8, weightG: 900 },
      { weight: '800g', price: 142.4, weightG: 1100 },
      { weight: '1kg', price: 175, weightG: 1300 },
      { weight: '1.5kg', price: 258, weightG: 1800 },
      { weight: '2kg', price: 340, weightG: 2300 },
    ],
  },
  'vrac-poudre': {
    name: 'Spiruline en poudre — Vrac',
    variants: [
      { weight: '500g', price: 79, weightG: 800 },
      { weight: '600g', price: 94.8, weightG: 900 },
      { weight: '800g', price: 126.4, weightG: 1100 },
      { weight: '1kg', price: 155, weightG: 1300 },
      { weight: '1.5kg', price: 228, weightG: 1800 },
      { weight: '2kg', price: 300, weightG: 2300 },
    ],
  },
};

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_RATES = { relais: 4.6, domicile: 9.9 };
const SHIPPING_LABELS = { relais: 'Point relais', domicile: 'Domicile (Colissimo)' };

module.exports = { CATALOG, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES, SHIPPING_LABELS };
