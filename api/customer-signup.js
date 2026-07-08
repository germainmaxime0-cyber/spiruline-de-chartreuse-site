// Création d'un compte client (facultatif) — donne accès aux codes promo et enregistre l'adresse
// pour ne plus avoir à la ressaisir aux commandes suivantes.

const { createCustomer, toPublicProfile } = require('./_customers');
const { createSessionToken, SESSION_DURATION_MS } = require('./_customer-auth');
const { sendEmail } = require('./_mailer');

function welcomeEmailHtml(customer) {
  return `
    <p>Bonjour ${customer.prenom},</p>
    <p>Votre compte sur <strong>Spiruline de Chartreuse</strong> a bien été créé — merci de votre confiance !</p>
    <p>Vous n'aurez plus besoin de ressaisir votre adresse à vos prochaines commandes, et vous bénéficiez de
    <strong>-10% automatiquement sur votre toute première commande</strong>, sans code à saisir.</p>
    <p>À bientôt,<br>L'équipe Spiruline de Chartreuse</p>
  `;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email, password, prenom, nom, telephone, rue, codePostal, ville } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email et mot de passe (8 caractères minimum) requis' });
  }
  if (!prenom || !nom || !telephone || !rue || !codePostal || !ville) {
    return res.status(400).json({ error: 'Merci de renseigner toutes vos coordonnées' });
  }

  const phoneDigits = telephone.replace(/\D/g, '');
  if (phoneDigits.length !== 10 || !phoneDigits.startsWith('0')) {
    return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 10 chiffres' });
  }

  const customer = await createCustomer(email, password, { prenom, nom, telephone, rue, codePostal, ville, pays: 'FR' });
  if (!customer) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const token = createSessionToken(customer.email);
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader('Set-Cookie', `customer_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`);

  // L'échec de l'envoi de l'email ne doit jamais bloquer la création de compte.
  try {
    await sendEmail({ to: customer.email, subject: 'Bienvenue chez Spiruline de Chartreuse', html: welcomeEmailHtml(customer) });
  } catch (err) {
    console.error('Échec envoi email de bienvenue :', err.message);
  }

  return res.status(200).json(toPublicProfile(customer));
};
