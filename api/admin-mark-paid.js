// Marque une commande payée par chèque/virement comme réglée (depuis /admin.html), une fois le
// chèque encaissé ou le virement reçu. Fait passer la commande de "en_attente_paiement" à
// "a_traiter", pour qu'elle apparaisse comme prête à expédier/envoyer vers Boxtal.

const { requireAuth } = require('./_auth');
const { getOrder, updateOrder } = require('./_orders');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!requireAuth(req, res)) return;

  const { orderId } = req.body || {};
  const order = orderId && (await getOrder(orderId));
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }
  if (order.status !== 'en_attente_paiement') {
    return res.status(400).json({ error: 'Cette commande n\'est pas en attente de paiement' });
  }

  const updated = await updateOrder(order.id, { status: 'a_traiter' });
  return res.status(200).json({ order: updated });
};
