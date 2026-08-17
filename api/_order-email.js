// Contenu des emails récapitulatifs de commande (client + entreprise), partagé entre le paiement
// par carte (stripe-webhook.js) et les paiements manuels (create-manual-order.js).

const SITE_URL = process.env.SITE_URL || 'https://www.spirulinedechartreuse.com';
const LOGO_URL = `${SITE_URL}/images/logo.png`;
const BRAND_COLOR = '#0E7C74';
const BRAND_TINT = '#E3F5F3';

// Gabarit visuel (logo + couleurs de marque) appliqué à tous les emails adressés au client —
// jamais à l'email interne businessRecapHtml, qui reste une simple notification texte.
// Le logo est chargé depuis le site en ligne : certaines messageries bloquent les images par
// défaut au premier affichage, c'est normal et sans conséquence sur la lisibilité du texte.
function wrapEmailHtml(bodyHtml) {
  return `
    <div style="background:#F0EBE0;padding:24px 18px 18px;text-align:center;font-family:Arial,sans-serif;">
      <img src="${LOGO_URL}" alt="Spiruline de Chartreuse" width="52" height="52" style="border-radius:12px;display:block;margin:0 auto 10px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${BRAND_COLOR};">Spiruline de Chartreuse</div>
    </div>
    <div style="background:#F0EBE0;padding:0 18px 18px;">
      <div style="background:white;border-radius:12px;padding:22px 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">
        ${bodyHtml}
      </div>
      <div style="padding:16px 4px 0;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#999;">
        GAEC Char'Algue &middot; 458 Rue de la Grande Terre, 38660 Le Touvet<br>contact@spirulinedechartreuse.com
      </div>
    </div>
  `;
}

function buttonHtml(url, label) {
  return `<div style="text-align:center;margin:18px 0 4px;"><a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:white;padding:11px 26px;border-radius:20px;font-size:13px;font-weight:bold;text-decoration:none;">${label}</a></div>`;
}

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

function deliveryBoxHtml(innerHtml) {
  return `<div style="background:${BRAND_TINT};border-left:3px solid ${BRAND_COLOR};border-radius:0 8px 8px 0;padding:12px 14px;margin:0 0 14px;">${innerHtml}</div>`;
}

function deliveryHtml(order) {
  if (order.modeLivraisonCle === 'retrait') {
    return deliveryBoxHtml(`<p style="margin:0 0 4px;font-weight:bold;">Retrait sur place (gratuit)</p><p style="margin:0;">${PICKUP_HOURS_TEXT}</p>`);
  }
  const pointRelais = order.pointRelaisNom
    ? ` — point relais : ${order.pointRelaisNom}`
    : (order.pointRelaisCode ? ` (point relais ${order.pointRelaisCode})` : '');
  const adresse = order.adresse ? `${order.adresse.rue}, ${order.adresse.codePostal} ${order.adresse.ville}` : '';
  return deliveryBoxHtml(`<p style="margin:0 0 4px;font-weight:bold;">${order.modeLivraison || ''}${pointRelais}</p><p style="margin:0;">${adresse}</p>`);
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
  return wrapEmailHtml(`
    <p>Bonjour ${order.prenom || ''},</p>
    <p>Merci pour votre commande <strong style="color:${BRAND_COLOR};">n&deg;${order.numeroCommande}</strong> !</p>
    <ul>${orderItemsHtml(order)}</ul>
    ${totalsBreakdownHtml(order)}
    ${deliveryHtml(order)}
    ${paymentInstructionsHtml(order)}
    <p>À bientôt,<br>L'équipe Spiruline de Chartreuse</p>
  `);
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
  return wrapEmailHtml(`
    <p>Bonjour ${order.prenom || ''},</p>
    <p>Votre commande <strong style="color:${BRAND_COLOR};">n&deg;${order.numeroCommande}</strong> a &eacute;t&eacute; annul&eacute;e.</p>
    <p>${refundText}</p>
    <p>Pour toute question, n'h&eacute;sitez pas &agrave; nous contacter.</p>
    <p>L'&eacute;quipe Spiruline de Chartreuse</p>
  `);
}

function shipmentSentHtml(order) {
  // Le texte principal dépend de l'étape réelle : tant que le numéro de suivi n'est pas confirmé
  // par le transporteur (webhook Boxtal TRACKING_CHANGED), le colis n'est pas forcément encore
  // remis physiquement — on ne promet pas "expédié" trop tôt. Une fois le numéro connu, c'est bien
  // le bon moment de l'annoncer.
  let trackingText = '';
  let introText;
  if (order.trackingNumber) {
    introText = `<p>Votre commande <strong style="color:${BRAND_COLOR};">n&deg;${order.numeroCommande}</strong> est exp&eacute;di&eacute;e !</p>`;
    trackingText = order.trackingUrl
      ? `<p style="margin:0 0 6px;">Num&eacute;ro de suivi : <strong>${order.trackingNumber}</strong></p>${buttonHtml(order.trackingUrl, 'Suivre mon colis')}`
      : `<p>Num&eacute;ro de suivi : <strong>${order.trackingNumber}</strong></p>`;
  } else {
    introText = `<p>Votre commande <strong style="color:${BRAND_COLOR};">n&deg;${order.numeroCommande}</strong> a &eacute;t&eacute; enregistr&eacute;e et sera bient&ocirc;t exp&eacute;di&eacute;e.</p>`;
  }
  return wrapEmailHtml(`
    <p>Bonjour ${order.prenom || ''},</p>
    ${introText}
    ${deliveryHtml(order)}
    ${trackingText}
    <p>&Agrave; bient&ocirc;t,<br>L'&eacute;quipe Spiruline de Chartreuse</p>
  `);
}

module.exports = { customerRecapHtml, businessRecapHtml, cancellationHtml, shipmentSentHtml };
