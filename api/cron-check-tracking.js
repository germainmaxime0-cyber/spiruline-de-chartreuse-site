// Tâche planifiée (voir "crons" dans vercel.json, exécutée toutes les 6 heures) : Boxtal ne propose
// pas de webhook self-service en API v3/v1 pour être notifié quand le numéro de suivi est prêt
// (confirmé — contrairement à Stripe), donc on interroge nous-mêmes périodiquement les commandes
// expédiées qui n'ont pas encore de numéro de suivi, et on envoie un email dès qu'il apparaît.
//
// Protégé par CRON_SECRET (variable d'environnement Vercel à créer) : Vercel l'envoie
// automatiquement dans l'en-tête Authorization pour les appels de cron, donc aucune requête
// publique ne peut déclencher cette tâche sans connaître ce secret.

const { listOrders, updateOrder } = require('./_orders');
const { boxtalRequest } = require('./_boxtal');
const { sendEmail } = require('./_mailer');
const { shipmentSentHtml } = require('./_order-email');

const TRACKING_URL_BUILDERS = {
  relais: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumeros=${encodeURIComponent(n)}`,
  domicile: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
};

function extractTrackingNumber(content) {
  if (!content) return null;
  const parcel = content.parcels && content.parcels[0];
  return (
    content.trackingNumber ||
    content.tracking_number ||
    content.trackingCode ||
    content.tracking_code ||
    content.carrierTrackingNumber ||
    (parcel && (parcel.trackingNumber || parcel.tracking_number || parcel.trackingCode || parcel.tracking_code)) ||
    (content.tracking && (content.tracking.number || content.tracking.trackingNumber)) ||
    (content.documents && content.documents.tracking && content.documents.tracking.number) ||
    null
  );
}

module.exports = async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const orders = await listOrders(100000);
  const pending = orders.filter((o) => o.status === 'envoye' && o.boxtal && o.boxtal.shippingOrderId && !o.boxtal.trackingNumber);

  const results = [];
  for (const order of pending) {
    try {
      const data = await boxtalRequest(`/shipping/v3.1/shipping-order/${order.boxtal.shippingOrderId}`);
      const trackingNumber = extractTrackingNumber(data.content);
      if (!trackingNumber) {
        results.push({ orderId: order.id, found: false });
        continue;
      }

      const updated = await updateOrder(order.id, { boxtal: { ...order.boxtal, trackingNumber } });

      if (updated.email) {
        const trackingUrl = TRACKING_URL_BUILDERS[order.modeLivraisonCle]
          ? TRACKING_URL_BUILDERS[order.modeLivraisonCle](trackingNumber)
          : null;
        await sendEmail({
          to: updated.email,
          subject: `Numéro de suivi disponible pour votre commande n°${updated.numeroCommande}`,
          html: shipmentSentHtml({ ...updated, trackingNumber, trackingUrl }),
        });
      }
      results.push({ orderId: order.id, found: true, trackingNumber });
    } catch (err) {
      console.error('Erreur vérification suivi Boxtal pour la commande', order.id, err.status, err.data || err.message);
      results.push({ orderId: order.id, found: false, error: err.message });
    }
  }

  console.log('cron-check-tracking :', JSON.stringify(results));
  return res.status(200).json({ checked: pending.length, results });
};
