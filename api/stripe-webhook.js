// Fonction serverless Vercel — écoute les évènements Stripe (paiement confirmé) et enregistre
// la commande comme "à traiter" (voir /admin.html), prête à être envoyée vers Boxtal en un clic.
// Cette fonction NE contacte PAS Boxtal elle-même : c'est /api/admin-send-to-boxtal.js qui le fait,
// déclenché manuellement depuis la page d'administration.
//
// Configuration requise dans le Dashboard Stripe : Développeurs > Webhooks > Ajouter un endpoint
//   URL de l'endpoint : https://votre-domaine.com/api/stripe-webhook
//   Évènement à écouter : checkout.session.completed
// Le "signing secret" (whsec_...) généré à cette étape doit être mis dans la variable
// d'environnement Vercel STRIPE_WEBHOOK_SECRET (jamais dans le code).

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { CATALOG } = require('./_catalog');
const { saveOrder, generateOrderNumber } = require('./_orders');
const { markCustomerOrdered } = require('./_customers');
const { sendEmail, businessEmail } = require('./_mailer');
const { customerRecapHtml, businessRecapHtml } = require('./_order-email');

// Vercel doit nous donner le corps brut (non parsé) pour que la vérification de signature Stripe fonctionne.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Méthode non autorisée');
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook Stripe invalide :', err.message);
    return res.status(400).send(`Signature invalide : ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id);
      const order = await buildOrder(fullSession);
      await saveOrder(order);
      const customerEmail = fullSession.metadata && fullSession.metadata.compte_client;
      if (customerEmail) {
        await markCustomerOrdered(customerEmail);
      }
      // L'envoi des emails ne doit jamais faire échouer le webhook : la commande est déjà enregistrée.
      try {
        if (order.email) {
          await sendEmail({ to: order.email, subject: `Confirmation de votre commande n°${order.numeroCommande}`, html: customerRecapHtml(order) });
        }
        await sendEmail({ to: businessEmail(), subject: `Nouvelle commande n°${order.numeroCommande}`, html: businessRecapHtml(order) });
      } catch (emailErr) {
        console.error('Échec de l\'envoi des emails de récapitulatif de commande', session.id, emailErr);
      }
    } catch (err) {
      // On loggue l'erreur mais on répond quand même 200 : sinon Stripe retentera cet évènement
      // pendant plusieurs jours, alors que la commande est déjà payée et doit être traitée manuellement.
      console.error('Échec de l\'enregistrement de la commande pour la session', session.id, err);
    }
  }

  return res.status(200).json({ received: true });
};

// Le numéro de commande n'est généré qu'ici, une fois le paiement confirmé par Stripe — jamais à
// la création de la session, sinon un panier abandonné ou une carte refusée "consommerait" un
// numéro pour rien, créant des trous dans la numérotation quotidienne.
async function buildOrder(session) {
  const address = session.metadata && session.metadata.adresse ? JSON.parse(session.metadata.adresse) : {};
  const cart = session.metadata && session.metadata.panier ? JSON.parse(session.metadata.panier) : [];
  const numeroCommande = await generateOrderNumber();

  return {
    id: session.id,
    numeroCommande,
    modePaiement: 'carte',
    createdAt: new Date().toISOString(),
    status: 'a_traiter',
    email: address.email || (session.customer_details && session.customer_details.email),
    telephone: address.telephone,
    prenom: address.prenom,
    nom: address.nom,
    adresse: { rue: address.rue, codePostal: address.codePostal, ville: address.ville, pays: address.pays },
    modeLivraisonCle: session.metadata && session.metadata.mode_livraison_cle,
    modeLivraison: session.metadata && session.metadata.mode_livraison,
    pointRelaisCode: (session.metadata && session.metadata.point_relais) || null,
    pointRelaisNom: (session.metadata && session.metadata.point_relais_nom) || null,
    reductionPourcent: session.metadata ? parseInt(session.metadata.reduction_pourcent, 10) || 0 : 0,
    sousTotalEur: session.metadata && session.metadata.sous_total_eur ? parseFloat(session.metadata.sous_total_eur) : null,
    fraisLivraisonEur: session.metadata && session.metadata.frais_livraison_eur ? parseFloat(session.metadata.frais_livraison_eur) : null,
    poidsColisKg: session.metadata && parseFloat(session.metadata.poids_colis),
    poidsSpirulineKg: session.metadata && parseFloat(session.metadata.poids_spiruline_kg),
    montantTotalEur: session.amount_total != null ? session.amount_total / 100 : null,
    contenu: cart.map((item) => {
      const product = CATALOG[item.p];
      const variant = product && product.variants[item.v];
      return { description: product ? `${product.name} — ${variant.weight}` : item.p, quantite: item.q };
    }),
    boxtal: null,
  };
}
