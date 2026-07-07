// Annule une commande depuis /admin.html : rembourse le paiement Stripe et annule l'expédition
// Boxtal si elle avait déjà été créée. Action manuelle uniquement, jamais automatique.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { requireAuth } = require('./_auth');
const { getOrder, updateOrder } = require('./_orders');
const { boxtalRequest } = require('./_boxtal');

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
  if (order.status === 'annulee') {
    return res.status(400).json({ error: 'Cette commande est déjà annulée' });
  }

  // Si une expédition avait déjà été créée chez Boxtal, on tente de l'annuler.
  // On ne bloque pas le remboursement si ça échoue (ex. déjà pris en charge par le transporteur) :
  // l'annulation manuelle chez Boxtal reste possible, mais le client doit être remboursé dans tous les cas.
  let boxtalCancelError = null;
  if (order.boxtal && order.boxtal.shippingOrderId) {
    try {
      await boxtalRequest(`/shipping/v3.1/shipping-order/${order.boxtal.shippingOrderId}`, { method: 'DELETE' });
    } catch (err) {
      boxtalCancelError = (err.data && JSON.stringify(err.data)) || err.message;
      console.error('Échec annulation Boxtal pour la commande', order.id, boxtalCancelError);
    }
  }

  let refundError = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(order.id);
    if (session.payment_intent) {
      await stripe.refunds.create({ payment_intent: session.payment_intent });
    }
  } catch (err) {
    refundError = err.message;
    console.error('Échec remboursement Stripe pour la commande', order.id, refundError);
  }

  const updated = await updateOrder(order.id, {
    status: 'annulee',
    boxtal: { ...order.boxtal, cancelError: boxtalCancelError },
    refundError,
  });

  if (refundError) {
    return res.status(502).json({ error: `Commande marquée annulée, mais le remboursement Stripe a échoué : ${refundError}`, order: updated });
  }
  return res.status(200).json({ order: updated });
};
