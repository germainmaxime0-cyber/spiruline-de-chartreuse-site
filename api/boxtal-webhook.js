// Reçoit les notifications Boxtal (événement TRACKING_CHANGED) dès qu'un numéro de suivi est
// attribué à une expédition. La souscription a été créée manuellement depuis l'espace développeur
// Boxtal (developer.boxtal.com > Applications > Souscriptions), pas via l'API — testée avec succès
// le 17/08/2026 (structure confirmée : id, timestamp, type, shippingOrderId, shipmentExternalId,
// payload).
//
// Configuration requise : variable d'environnement Vercel BOXTAL_WEBHOOK_SECRET, avec la même
// valeur que la "clé de vérification des requêtes" saisie lors de la création de la souscription.
// Tant qu'elle n'est pas configurée, la vérification de signature est ignorée (ne jamais laisser
// en production sans le secret, n'importe qui pourrait alors déclencher cet endpoint).

const crypto = require('crypto');
const { listOrders, updateOrder } = require('./_orders');
const { sendEmail } = require('./_mailer');
const { shipmentSentHtml } = require('./_order-email');

const TRACKING_URL_BUILDERS = {
  relais: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumeros=${encodeURIComponent(n)}`,
  domicile: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
};

// Ne concerne que les commandes passées à partir de la mise en place de ce webhook : voir le
// commentaire plus bas pour la raison.
const TRACKING_CUTOFF_DATE = '2026-08-17T00:00:00Z';

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extractTrackingNumber(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /track/i.test(key)) return value;
    if (value && typeof value === 'object') {
      const found = extractTrackingNumber(value);
      if (found) return found;
    }
  }
  return null;
}

function extractShippingOrderId(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /shippingOrder(Id)?$/i.test(key)) return value;
    if (value && typeof value === 'object') {
      const found = extractShippingOrderId(value);
      if (found) return found;
    }
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const rawBody = await readRawBody(req);

  if (process.env.BOXTAL_WEBHOOK_SECRET) {
    const expected = crypto.createHmac('sha256', process.env.BOXTAL_WEBHOOK_SECRET).update(rawBody).digest('hex');
    const received = req.headers['x-bxt-signature'];
    if (received !== expected) {
      console.error('Signature webhook Boxtal invalide');
      return res.status(401).json({ error: 'Signature invalide' });
    }
  } else {
    console.warn('BOXTAL_WEBHOOK_SECRET non configuré — signature non vérifiée (à corriger avant mise en production réelle)');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'JSON invalide' });
  }

  console.log('Webhook Boxtal reçu — structure :', JSON.stringify(Object.keys(payload || {})));

  const trackingNumber = extractTrackingNumber(payload);
  const shippingOrderId = extractShippingOrderId(payload);

  if (!trackingNumber || !shippingOrderId) {
    console.log('Webhook Boxtal — champs non trouvés, contenu complet :', JSON.stringify(payload));
    return res.status(200).json({ received: true, matched: false });
  }

  try {
    const orders = await listOrders(100000);
    const order = orders.find((o) => o.boxtal && o.boxtal.shippingOrderId === shippingOrderId);
    if (!order) {
      console.error('Webhook Boxtal : aucune commande ne correspond à', shippingOrderId);
      return res.status(200).json({ received: true, matched: false });
    }

    // Sécurité : une commande déjà reçue par le client avant la mise en place de ce webhook ne
    // doit jamais déclencher un email de suivi a posteriori, source de confusion ("pourquoi je
    // reçois ça, j'ai déjà mon colis ?"). Ne concerne que les commandes passées à partir d'ici.
    if (!order.createdAt || order.createdAt < TRACKING_CUTOFF_DATE) {
      console.log('Webhook Boxtal : commande antérieure à la mise en place du suivi, ignorée', order.id);
      return res.status(200).json({ received: true, matched: false, reason: 'before-cutoff' });
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

    return res.status(200).json({ received: true, matched: true, orderId: order.id });
  } catch (err) {
    console.error('Erreur traitement webhook Boxtal :', err.message);
    // On répond 200 quand même : Boxtal retenterait sinon pendant des heures alors que le souci
    // vient probablement de notre côté (email en échec par ex.), pas d'un évènement à renvoyer.
    return res.status(200).json({ received: true, error: err.message });
  }
};
