// Indique si un client est connecté (utilisé par commander.html pour afficher ou non le champ code promo).

const { getLoggedInEmail } = require('./_customer-auth');
const { getCustomer } = require('./_customers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const email = getLoggedInEmail(req);
  if (!email) {
    return res.status(200).json({ loggedIn: false });
  }

  const customer = await getCustomer(email);
  if (!customer) {
    return res.status(200).json({ loggedIn: false });
  }

  return res.status(200).json({ loggedIn: true, email: customer.email, hasOrdered: customer.hasOrdered });
};
