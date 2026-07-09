// Historique des commandes du client connecté, pour la page mon-compte.html.
// Ne renvoie jamais les commandes d'un autre client : filtrage strict par l'email de la session
// signée (cookie), jamais par une valeur envoyée depuis le navigateur.

const { getLoggedInEmail } = require('./_customer-auth');
const { listOrders } = require('./_orders');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const email = getLoggedInEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Non connecté' });
  }

  const allOrders = await listOrders(100000);
  const myOrders = allOrders
    .filter((o) => (o.email || '').trim().toLowerCase() === email.trim().toLowerCase())
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return res.status(200).json({ orders: myOrders });
};
