// Envoi d'emails transactionnels via Resend (gratuit jusqu'à 3000 emails/mois).
//
// Variables d'environnement à configurer :
//   RESEND_API_KEY — clé API de votre compte Resend
//   MAIL_FROM      — adresse d'expédition, ex. "Spiruline de Chartreuse <commandes@spirulinedechartreuse.com>"
//                     (nécessite d'avoir vérifié le domaine spirulinedechartreuse.com dans Resend,
//                     sinon repli automatique sur l'adresse de test Resend ci-dessous)
//   MAIL_BUSINESS_TO — adresse recevant les notifications de nouvelle commande (défaut : contact@spirulinedechartreuse.com)

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Spiruline de Chartreuse <onboarding@resend.dev>';
const DEFAULT_BUSINESS_TO = 'contact@spirulinedechartreuse.com';

async function sendEmail({ to, subject, html }) {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(`Resend a échoué (${res.status}) : ${data ? JSON.stringify(data) : res.statusText}`);
  }
  return res.json();
}

function businessEmail() {
  return process.env.MAIL_BUSINESS_TO || DEFAULT_BUSINESS_TO;
}

module.exports = { sendEmail, businessEmail };
