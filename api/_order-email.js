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
  const pointRelais = order.pointRelaisNom
    ? ` — point relais : ${order.pointRelaisNom}`
    : (order.pointRelaisCode ? ` (point relais ${order.pointRelaisCode})` : '');
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

// Détail sous-total / réduction / livraison, pour que la réduction 1ère commande (ou un code promo)
// soit visible noir sur blanc dans l'email, plutôt qu'un simple total qu'il faudrait recalculer à la main.
function totalsBreakdownHtml(order) {
  if (order.sousTotalEur == null) return `<p><strong>Total : ${totalHtml(order)}</strong></p>`;
  const lines = [`<li>Sous-total produits : ${order.sousTotalEur.toFixed(2)} €</li>`];
  if (order.reductionPourcent) {
    const montantReduction = order.sousTotalEur * order.reductionPourcent / 100;
    lines.push(`<li>Réduction -${order.reductionPourcent}% : -${montantReduction.toFixed(2)} €</li>`);
  }
  const livraisonText = order.fraisLivraisonEur ? `${order.fraisLivraisonEur.toFixed(2)} €` : 'Offerte';
  lines.push(`<li>Livraison : ${livraisonText}</li>`);
  return `<ul>${lines.join('')}</ul><p><strong>Total : ${totalHtml(order)}</strong></p>`;
}

function customerRecapHtml(order) {
  return `
    <p>Bonjour ${order.prenom || ''},</p>
    <p>Merci pour votre commande <strong>n&deg;${order.numeroCommande}</strong> !</p>
    <ul>${orderItemsHtml(order)}</ul>
    ${totalsBreakdownHtml(order)}
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
    ${totalsBreakdownHtml(order)}
    ${deliveryHtml(order)}
    <p>Mode de paiement : ${order.modePaiement || 'carte'}</p>
  `;
}

function cancellationHtml(order) {
  const refundText = (order.modePaiement === 'carte' || !order.modePaiement)
    ? (order.refundError
        ? "Nous revenons vers vous rapidement au sujet du remboursement."
        : "Le remboursement a été effectué et apparaîtra sur votre moyen de paiement sous quelques jours.")
    : "Si vous aviez déjà réglé cette commande, contactez-nous pour organiser le remboursement.";
  return `
    <p>Bonjour ${order.prenom || ''},</p>
    <p>Votre commande <strong>n&deg;${order.numeroCommande}</strong> a &eacute;t&eacute; annul&eacute;e.</p>
    <p>${refundText}</p>
    <p>Pour toute question, n'h&eacute;sitez pas &agrave; nous contacter.</p>
    <p>L'&eacute;quipe Spiruline de Chartreuse</p>
  `;
}

module.exports = { customerRecapHtml, businessRecapHtml, cancellationHtml };
