// Liste les commandes payées (les plus récentes en premier) pour /admin.html.

const { requireAuth } = require('./_auth');
const { listOrders } = require('./_orders');
const { getCustomer } = require('./_customers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const orders = await listOrders();

    // Vérifié à la lecture (pas seulement stocké au moment de la commande) : ça fonctionne aussi
    // rétroactivement pour les commandes passées avant l'ajout de ce champ.
    const uniqueEmails = [...new Set(orders.map((o) => (o.email || '').trim().toLowerCase()).filter(Boolean))];
    const accountByEmail = new Map();
    await Promise.all(uniqueEmails.map(async (email) => {
      accountByEmail.set(email, !!(await getCustomer(email)));
    }));
    const ordersWithAccount = orders.map((o) => ({
      ...o,
      hasAccount: accountByEmail.get((o.email || '').trim().toLowerCase()) || false,
    }));

    return res.status(200).json({ orders: ordersWithAccount });
  } catch (err) {
    console.error('Erreur lecture des commandes :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
