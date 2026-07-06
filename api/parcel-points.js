// Fonction serverless Vercel — recherche des points relais Boxtal proches d'une adresse,
// pour que le client en choisisse un dans commander.html sans exposer les identifiants Boxtal au navigateur.
//
// Utilise /shipping/v3.2/parcel-point-by-shipping-offer, qui filtre directement par shippingOfferCode :
// ça garantit que les points retournés sont bien compatibles avec l'offre réellement achetée
// (pas besoin de deviner un nom de réseau transporteur séparément).
//
// Variable d'environnement à configurer (même valeur que dans admin-send-to-boxtal.js) :
//   BOXTAL_OFFER_CODE_RELAIS — défaut "CHRP-Chrono2ShopDirect" (Chronopost, point relais France)

const { boxtalRequest } = require('./_boxtal');

const DEFAULT_OFFER_CODE_RELAIS = 'CHRP-Chrono2ShopDirect';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { street, city, postalCode, countryIsoCode } = req.query;
  if (!postalCode || !city) {
    return res.status(400).json({ error: 'Code postal et ville requis' });
  }

  const params = new URLSearchParams({
    city,
    postalCode,
    countryIsoCode: (countryIsoCode || 'FR').toUpperCase(),
    operationType: 'ARRIVAL',
    shippingOfferCode: process.env.BOXTAL_OFFER_CODE_RELAIS || DEFAULT_OFFER_CODE_RELAIS,
  });
  if (street) params.set('street', street);

  try {
    const data = await boxtalRequest(`/shipping/v3.2/parcel-point-by-shipping-offer?${params.toString()}`);
    console.log('DEBUG réponse Boxtal parcel-point:', JSON.stringify(data));
    const points = (data.content || []).map((entry) => ({
      code: entry.parcelpoint.code,
      name: entry.parcelpoint.name,
      distanceM: entry.distanceFromSearchLocation,
      location: entry.parcelpoint.location,
    }));
    return res.status(200).json({ points });
  } catch (err) {
    console.error('Erreur recherche points relais Boxtal :', err.status, err.data || err.message);
    return res.status(502).json({ error: 'Recherche de points relais indisponible' });
  }
};
