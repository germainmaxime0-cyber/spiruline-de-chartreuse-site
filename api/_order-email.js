// Contenu des emails récapitulatifs de commande (client + entreprise), partagé entre le paiement
// par carte (stripe-webhook.js) et les paiements manuels (create-manual-order.js).

const PICKUP_ADDRESS = "GAEC Char'Algue, 458 Rue de la Grande Terre, 38660 Le Touvet";
const PICKUP_HOURS_TEXT = `Mercredi de 16h à 18h30 et samedi de 9h30 à 12h30, à la ferme (${PICKUP_ADDRESS}).`;

const CHEQUE_INSTRUCTIONS = `
  <p>Merci d'envoyer votre chèque à l'ordre de <strong>GAEC Char'Algue</strong> à l'adresse suivante :<br>
  GAEC Char'Algue<br>458 Rue de la Grande Terre<br>38660 Le Touvet</p>
`;

const VIREMENT_INSTRUCTIONS = `
  <p>Merci d'effectuer votre virement avec les coordonnées bancaires suivantes :<br>
  Banque : Crédit Agricole Le Touvet<br>
  IBAN : FR76 1390 6001 4985 0480 7116 927<br>
  BIC : AGRIFRPP839</p>
`;

function orderItemsHtml(order) {
  return (order.contenu || []).map((item) => `<li>${item.quantite}&times; ${item.description}</li>`).join('');
}

function deliveryHtml(order) {
  if (order.modeLivraisonCle === 'retrait') {
    return `<p><strong>Retrait sur place (gratuit)</strong><br>${PICKUP_HOURS_TEXT}</p>`;
  }
  const pointRelais = order.pointRelaisCode ? ` (point relais ${order.pointRelaisCode})` : '';
  const adresse = order.adresse ? `${order.adresse.rue}, ${order.adresse.codePostal} ${order.adresse.ville}` : '';
  return `<p><strong>${order.modeLivraison || ''}</strong>${pointRelais}<br>${adresse}</p>`;
}

function paymentInstructionsHtml(order) {
  if (order.modePaiement === 'cheque') return CHEQUE_INSTRUCTIONS;
  if (order.modePaiement === 'virement') return VIREMENT_INSTRUCTIONS;
  return '';
}

function totalHtml(order) {
  return order.montantTotalEur != null ? `${order.montantTotalEur.toFixed(2)} €` : '';
}

function customerRecapHtml(order) {
  return `
    <p>Bonjour ${order.prenom || ''},</p>
    <p>Merci pour votre commande <strong>n&deg;${order.numeroCommande}</strong> !</p>
    <ul>${orderItemsHtml(order)}</ul>
    <p><strong>Total : ${totalHtml(order)}</strong></p>
    ${deliveryHtml(order)}
    ${paymentInstructionsHtml(order)}
    <p>À bientôt,<br>L'équipe Spiruline de Chartreuse</p>
  `;
}

function businessRecapHtml(order) {
  return `
    <p>Nouvelle commande <strong>n&deg;${order.numeroCommande}</strong> reçue.</p>
    <p>${order.prenom || ''} ${order.nom || ''} &mdash; ${order.email || ''} &mdash; ${order.telephone || ''}</p>
    <ul>${orderItemsHtml(order)}</ul>
    <p><strong>Total : ${totalHtml(order)}</strong></p>
    ${deliveryHtml(order)}
    <p>Mode de paiement : ${order.modePaiement || 'carte'}</p>
  `;
}

module.exports = { customerRecapHtml, businessRecapHtml };
