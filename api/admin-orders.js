// Liste les commandes payées (les plus récentes en premier) pour /admin.html.

const { requireAuth } = require('./_auth');
const { listOrders } = require('./_orders');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const orders = await listOrders();
    return res.status(200).json({ orders });
  } catch (err) {
    console.error('Erreur lecture des commandes :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
